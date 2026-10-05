import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Flags } from './flags';
import { holderOf, isPortFree } from './net';
import { waitUntil } from './poll';
import { startProcess, type Proc } from './procs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOGS = join(ROOT, 'e2e', 'demo', '.logs');

export interface Stack {
  apiUrl: string;
  webUrl: string;
  stop: () => Promise<void>;
}

export function assertNodeVersion(version: string): void {
  if (Number(version.replace(/^v/, '').split('.')[0]) < 22) {
    throw new Error(`the demo needs Node >= 22, found ${version}`);
  }
}

export async function assertPortsFree(ports: readonly number[]): Promise<void> {
  for (const port of ports) {
    if (await isPortFree(port)) continue;
    const who = await holderOf(port);
    throw new Error(`port ${port} is already in use by ${who}; stop it or pass --reuse`);
  }
}

const okAt = (url: string) => async () => (await fetch(url)).ok;

const isUp = (url: string) => okAt(url)().catch(() => false);

function spawnWorker(apiPort: number): Proc {
  const env = { E2E_API_PORT: String(apiPort) };
  return startProcess('bash', ['e2e/scripts/start-worker.sh'], {
    cwd: ROOT,
    env,
    logFile: join(LOGS, 'worker.log'),
  });
}

function spawnWeb(webPort: number, apiUrl: string): Proc {
  const args = [
    '--filter',
    '@bsbox/web',
    'exec',
    'vite',
    '--port',
    String(webPort),
    '--strictPort',
  ];
  return startProcess('pnpm', args, {
    cwd: ROOT,
    env: { BSBOX_API_TARGET: apiUrl },
    logFile: join(LOGS, 'web.log'),
  });
}

async function boot(
  apiPort: number,
  webPort: number,
  apiUrl: string,
  webUrl: string,
): Promise<Stack> {
  const procs = [spawnWorker(apiPort), spawnWeb(webPort, apiUrl)];
  const stop = async () => {
    await Promise.all(procs.map((p) => p.stop()));
    rmSync(join(ROOT, '.e2e-state'), { recursive: true, force: true });
  };
  try {
    await waitUntil(okAt(`${apiUrl}/api/health`), {
      timeoutMs: 90_000,
      intervalMs: 500,
      what: `the worker (see ${LOGS}/worker.log)`,
    });
    await waitUntil(okAt(webUrl), {
      timeoutMs: 60_000,
      intervalMs: 500,
      what: `vite (see ${LOGS}/web.log)`,
    });
  } catch (e) {
    await stop();
    throw e;
  }
  return { apiUrl, webUrl, stop };
}

/** Starts (or, with --reuse, adopts) the local worker and web dev server. */
export async function startStack(flags: Flags): Promise<Stack> {
  assertNodeVersion(process.version);
  const apiPort = Number(process.env.E2E_API_PORT ?? 8788);
  const webPort = Number(process.env.E2E_WEB_PORT ?? 5173);
  const [apiUrl, webUrl] = [`http://localhost:${apiPort}`, `http://localhost:${webPort}`];
  if (flags.reuse && (await isUp(`${apiUrl}/api/health`)) && (await isUp(webUrl))) {
    return { apiUrl, webUrl, stop: async () => {} };
  }
  await assertPortsFree([apiPort, webPort]);
  return boot(apiPort, webPort, apiUrl, webUrl);
}
