const HOME = require('os').homedir();

const fs = require('fs');
const base32 = require('bs32');
const blake3 = require('blake3');
const { Zone, wire, dnssec } = require('bns');
const { SOARecord, Record, codes, types } = wire;
const Replicator = require('@hyperswarm/replicator');
const Hyperzone = require('hyperzone');
const Cache = require('bns/lib/cache');

const empty = new Zone();

// todo: Class-ify
function middleware (dir) {
  const zones = new Map();
  const storageDir = dir || `${HOME}/.hyperzones/auth`;
  const hyperzoneOpts = { sparse: true, alwaysUpdate: true };
  const replicatorOpts = { client: true, server: true, live: true };
  const replicator = new Replicator();
  replicator.on('connection', (socket, info) => {
    console.log('[hyperzone] connection @', base32.encode(info.publicKey));
  });
  replicator.on('delete', (info) => {
    console.log('[hyperzone] closed @', base32.encode(info.publicKey));
  });
  replicator.on('close', () => {
    console.log('[hyperzone] closed.');
  });

  let loadedZones = false;

  const put = (key, opts) => {
    if (!key) {
      return;
    }

    let buf;
    if (typeof key === 'string') {
      if (key.length === 52) {
        buf = base32.decode(key);
      } else if (key.length === 64) {
        buf = Buffer.from(key, 'hex');
        key = base32.encode(buf);
      } else {
	return;
      }
    } else if (Buffer.isBuffer(key)) {
      buf = key;
      key = base32.encode(buf);
    } else {
      return;
    }

    let zone = zones.get(key);
    if (zone) {
      return zone;
    }

    console.log(`[hyperzone] put : ${key}`);

    const promise = new Promise(async (resolve) => {
      const storage = `${storageDir}/${key}`;

      zone = new Hyperzone(storage, buf, opts);
      zones.set(key, zone);
      resolve(zone);
      replicator.add(zone.db, replicatorOpts);
      await zone.ready();
      const origin = await zone.origin();
      zones.set(origin, zone);
    });

    zones.set(key, promise);

    return promise;
  };

  try {
    Promise.all(fs.readdirSync(storageDir).map(put))
      .then(() => loadedZones = true)
      .catch(console.error);
  } catch (e) {}

  return {
    hostname: ':data.:protocol(_hyperzone|hyperzone).:gateway?.',
    handler: async function ({ protocol, data }, name, type, response, rc, ns) {
      if (name.indexOf(protocol) > 0) {
        return null;
      }

      for (const [origin, zone] of zones.entries()) {
        if (origin === ns.name) {
          const res = await zone.resolve(name, type, origin);
          await handleCache(zone, res, name, type, origin, rc, this.cache)
          return res
        }
      }

      data = data.split('.');
      const key = data[data.length - 1];
      if (key.length === 52) {
        const zone = await put(key);
        if (zone.origin) {
          const origin = await zone.origin();
          if (origin) {
            // cache (name, type, ns.name) -> cache_entry
            // on new hyperzone data, lookup (name, type, ns.name) to fetch new data
            //   clear cache_entry if new data

            const res = await zone.resolve(name, type, ns.name);
            await handleCache(zone, res, name, type, origin, rc, this.cache)
            return res
          }
        }
        const res = empty.resolve(name, types[type]);
        res.code = codes.SERVFAIL; // ensure response not cached
        return res;
      } else {
        return response;
      }
    }
  };
}

module.exports = middleware;

async function handleCache (zone, res, name, type, origin, rc, cache) {
  rc.cacheHandlers.push(id => {

    const oldData = blake3.hash([...res.answer, ...res.authority, ...res.additional].join('.')).toString('hex')
    const handler = async () => {
      const update = await zone.resolve(name, type, origin)
      const newData = blake3.hash([...update.answer, ...update.authority, ...update.additional].join('.')).toString('hex')
      if (oldData !== newData) {
        console.log(`[hyperzone] received update : stale cache cleared.`);
        cache.remove(id)
      } else {
        console.log(`[hyperzone] received update : cache still fresh.`);
        zone.db.feed.update(handler)
      }
    }
    zone.db.feed.update(handler)
  })
}
