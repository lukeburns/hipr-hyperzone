# HIP-R Hyperzone Middleware

## Usage

```js
const { RecursiveServer } = require('hipr')
const hyperzone = require('hipr-hyperzone')

const server = new RecursiveServer(options)
server.use(hyperzone())
server.bind(53)
```

See `server.js` for a working implementation. 

Run

```
sudo node server.js 127.0.0.1:53 127.0.0.1:9891
```

to start a recursive resolver on port 53 using an hsd root nameserver running on port 9891 as a stub resolver (e.g. Bob wallet).