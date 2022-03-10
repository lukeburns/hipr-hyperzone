const HOME = require('os').homedir()

const base32 = require('bs32')
const { Zone, wire, dnssec } = require('bns')
const { SOARecord, Record, codes } = wire
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
  replicator.on('connection', () => console.log('> connection'))

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
    hostname: ':data.:protocol(_hyper|ns.direct).', 
    handler: async ({ protocol, data }, name, type) => {
      console.log(`${name} ${type}`)
      console.log(`  ${protocol} ${data}`)

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
            const res = zone.resolve(name, type)
            return res
          } else {
            const res = empty.resolve(name, type)
            res.code = codes.SERVFAIL // servfail if we don't have the data yet
            return res
          }
        } else {
          // just a promise
        }
      } else {
        return rc.res
      }
    }
  }
}

module.exports = middleware