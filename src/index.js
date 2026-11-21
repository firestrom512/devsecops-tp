'use strict';

const app = require('./app');
const requestedPort = Number(process.env.PORT ?? 3000);
const port = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65535
  ? requestedPort : 3000;
app.listen(port, '0.0.0.0', () => {
  process.stdout.write(`API sur le port ${port}\n`);
});
