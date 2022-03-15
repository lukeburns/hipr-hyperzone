const HOME = require('os').homedir()

const base32 = require('bs32')
const { Zone, wire, dnssec } = require('bns')
const { SOARecord, Record, codes, types } = wire
const Replicator = require('@hyperswarm/replicator')
const Hyperzone = require('hyperzone')

const empty = new Zone()

// todo: Class-ify
function middleware (dir) {
  const zones = new Map()
  const storageDir = dir || `${HOME}/.hyperzones/auth`
  const hyperzoneOpts = { sparse: true, alwaysUpdate: true }
  const replicatorOpts = { client: true, server: true }
  const replicator = new Replicator()
  replicator.on('connection', () => console.log('[hyperzone] connection')) // todo: fix leaks

  const add = (key, opts) => {
    const buf = base32.decode(key)
    key = key.toString('hex')
    let zone = zones.get(key)
    if (zone) {
      return zone
    }

    const promise = new Promise(async (resolve) => {
      const storage = `${storageDir}/${key}`
      zone = new Hyperzone(storage, key, opts)
      zones.set(key, zone)
      resolve(zone)
      replicator.add(zone.db, replicatorOpts)
      await zone.ready()
      const origin = await zone.origin()
      zones.set(origin, zone)
    })

    zones.set(key, promise)

    return promise
  }

  return {
    hostname: ':data.:protocol(_hyper|_hyperzone|hyperzone|ns.direct).:gateway?.', 
    handler: async ({ protocol, data }, name, type, response) => {
      if (name.indexOf(protocol) > 0) {
        return null
      }

      for (const [origin, zone] of zones.entries()) {
        const s = name.split(origin)
        if (!s[s.length - 1]) {
          return zone.resolve(name, type)
        }
      }

      data = data.split('.')
      const key = data[data.length - 1]
      if (key.length === 52) {
        const zone = await add(key)
        if (zone.origin) {
          const origin = await zone.origin()
          if (origin) {
            return await zone.resolve(name, type)
          }
        }
        const res = empty.resolve(name, types[type])
        res.code = codes.SERVFAIL // ensure response not cached
        return res
      } else {
        return response
      }
    }
  }
}

module.exports = middleware
