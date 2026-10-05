import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { runLoad } from './run';

let server: Server | undefined;
afterEach(() => void server?.close());

/** Creates series fine, then destroys every WebSocket upgrade: a deliberately broken server. */
async function brokenServer(): Promise<string> {
  const start = Math.floor(Date.now() / 1000) - 30;
  server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.method === 'POST') return void res.writeHead(201).end('{"code":"BROKEN00001"}');
    res.end(JSON.stringify({ session: { id: `BROKEN00001-${start}`, start, end: start + 300 } }));
  });
  server.on('upgrade', (_req, socket) => socket.destroy());
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server?.address() as AddressInfo).port}`;
}

describe('runLoad', () => {
  it('exits non-zero when every client fails against a broken server', async () => {
    const baseUrl = await brokenServer();
    const report = await runLoad({
      baseUrl,
      clients: 5,
      durationS: 2,
      voteEveryMs: 200,
      limits: { p95Ms: 6500, maxErrorRate: 0.01 },
      log: () => undefined,
    });
    expect(report.exitCode).toBe(1);
    expect(report.evaluation.errorRate).toBeGreaterThan(0.01);
  });
});
