# Hyperzone Middleware

## Usage

First install the [`hipr` CLI](https://github.com/lukeburns/hipr#cli-usage), then install `hipr-hyperzone` in your `~/.hipr` directory:

```
npm i --prefix ~/.hipr hipr-hyperzone
```

Now you can run `hipr` with `hipr-hyperzone` middleware:

```
hipr hipr-hyperzone
```

## Library Usage

You can also use `hipr-hyperzone` as a library, if you're rigging up your own `hipr` resolver.

```js
const { RecursiveServer } = require('hipr')
const hyperzone = require('hipr-hyperzone')

const server = new RecursiveServer(options)
server.use(hyperzone())
server.bind(53)
```