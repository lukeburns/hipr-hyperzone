#!/usr/bin/env node

let [serverHost, serverPort] = (process.argv[2] || '127.0.0.1:53').split(':')
let [rootHost, rootPort] = (process.argv[3] || '127.0.0.1:9891').split(':')
serverPort = parseInt(serverPort || 53)
rootPort = parseInt(rootPort || 53)

const { RecursiveServer, createDS } = require('hipr')
const hyperzone = require('./index')

const server = new RecursiveServer({ tcp: true, inet6: true, edns: true, dnssec: true })
server.parseOptions({ dnssec: true }) // todo: fix (https://discord.com/channels/822591034202521641/936327800892317766/943527417383886848)
server.resolver.setStub(rootHost, rootPort, createDS())

server.use(hyperzone())

server.bind(serverPort, serverHost)
console.log(`listening on ${serverHost}:${serverPort}`)
console.log(`resolving with ${rootHost}:${rootPort}`)
