import { execFile } from 'node:child_process';
import { createServer } from 'node:net';

export function assertLocalUrl(url: string): void {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url)) {
    throw new Error(`refusing to run the demo against a non-local target: ${url}`);
  }
}

/** True when nothing accepts connections on the port (checked on both loopback families). */
export async function isPortFree(port: number): Promise<boolean> {
  return (await canBind(port, '127.0.0.1')) && (await canBind(port, '::1'));
}

function canBind(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', (e: NodeJS.ErrnoException) => resolve(e.code === 'EADDRNOTAVAIL'));
    server.listen(port, host, () => server.close(() => resolve(true)));
  });
}

/** Best-effort name of the process holding a port, for error messages. */
export function holderOf(port: number): Promise<string> {
  return new Promise((resolve) => {
    execFile('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], (_err, out) => {
      resolve(out.split('\n')[1]?.trim() || 'an unknown process');
    });
  });
}
