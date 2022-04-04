# Hyperzone Middleware

## Usage

First install the [`hipr` CLI](https://github.com/lukeburns/hipr#cli-usage), then install `hipr-hyperzone` in your `~/.hipr` directory:

```
npm i --prefix ~/.hipr hipr-hyperzone
```

Now you can run a `hipr` recursive nameserver with `hipr-hyperzone` middleware:

```
hipr hipr-hyperzone
```

which resolves hyperzones! You can `npm i -g hyperzone` to install the [`hyperzone`](https://github.com/lukeburns/hyperzone) CLI for managing and replicating zones, e.g. `hyperzone example.com.`

## Library Usage

You can also use `hipr-hyperzone` as a library, if you're rigging up your own `hipr` resolver.

```js
const { AuthServer } = require('hipr')
const hyperzone = require('hipr-hyperzone')

const server = new AuthServer(options)
server.resolver.setServers(['127.0.0.1:5349']) // root hsd stub
server.use(hyperzone())
server.bind(53)
```
