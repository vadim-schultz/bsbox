/* global console, process */
// Fails when a deployed wrangler environment lacks a required binding or secret declaration.
// Usage: node scripts/check-wrangler-config.mjs [path-to-wrangler.jsonc]
import { readFileSync } from 'node:fs';
import path from 'node:path';

const file = process.argv[2] ?? path.join(import.meta.dirname, '../apps/worker/wrangler.jsonc');
const strip = (text) => text.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');
const config = JSON.parse(strip(readFileSync(file, 'utf8')));

const names = (list, key) => (list ?? []).map((x) => x[key]);
const checks = {
  'secret TOKEN_HMAC_KEY': (e) => e.secrets?.required?.includes('TOKEN_HMAC_KEY'),
  'D1 binding DB': (e) => names(e.d1_databases, 'binding').includes('DB'),
  'rate limit SERIES_RATE_LIMITER': (e) =>
    names(e.ratelimits, 'name').includes('SERIES_RATE_LIMITER'),
  'Durable Object SESSION_ROOM': (e) =>
    names(e.durable_objects?.bindings, 'name').includes('SESSION_ROOM'),
  'DO migration': (e) => (e.migrations ?? []).length > 0,
  'cron trigger': (e) => (e.triggers?.crons ?? []).length > 0,
  'analytics dataset EVENTS': (e) =>
    names(e.analytics_engine_datasets, 'binding').includes('EVENTS'),
  'static assets': (e) => e.assets?.binding === 'ASSETS' && Boolean(e.assets?.directory),
  'Workers Logs': (e) => e.observability?.enabled === true,
  'custom domain route': (e) => (e.routes ?? []).some((r) => r.custom_domain === true),
};

let failed = false;
for (const env of ['staging', 'production']) {
  const section = config.env?.[env];
  if (!section) {
    console.error(`FAIL: environment ${env} is missing`);
    failed = true;
    continue;
  }
  for (const [label, ok] of Object.entries(checks)) {
    if (!ok(section)) {
      console.error(`FAIL: ${env} lacks ${label}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log('wrangler config ok');
