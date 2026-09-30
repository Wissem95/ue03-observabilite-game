'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./app');
const { Fleet } = require('./fleet');
const { normalize } = require('./detection');
const { createMetrics } = require('./metrics');
let metrics;

const PORT = Number(process.env.PORT ?? 8080);
const LOG_FILE = process.env.LOG_FILE ?? path.join(__dirname, '..', 'logs', 'telemetry.log');
const BUILD = process.env.BUILD ?? 'beta-20260926-6';

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
const stream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

const log = (obj) => {
  obj = normalize({ ...obj, simulation_speed: obj.source === 'ingest' ? 1 : Number(process.env.SPEED ?? 10) });
  if (metrics) metrics.observe(obj);
  const line = JSON.stringify(obj);
  stream.write(line + '\n');
  if (process.env.LOG_STDOUT !== '0') process.stdout.write(line + '\n');
};

const fleet = new Fleet({
  build: BUILD,
  gamesPerMinute: Number(process.env.GAMES_PER_MINUTE ?? 4),
  speed: Number(process.env.SPEED ?? 10),
  incidents: process.env.INCIDENTS !== '0',
});
metrics = createMetrics(fleet);
fleet.on('log', log);
fleet.start();

const app = createApp({ fleet, log, metrics });
const server = app.listen(PORT, () => {
  log({ ts: new Date().toISOString(), level: 'info', event: 'startup', port: PORT, build: BUILD });
});

const shutdown = () => {
  fleet.stop();
  server.close(() => stream.end(() => process.exit(0)));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
