# Hyperzone Middleware

## Usage

```js
const { RecursiveServer } = require('hipr')
const hyperzone = require('hipr-hyperzone')

const server = new RecursiveServer(options)
server.use(hyperzone())
server.bind(53)
```