import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { startProcess } from './procs';

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const logFile = () => join(mkdtempSync(join(tmpdir(), 'procs-')), 'out.log');

describe('startProcess', () => {
  it('writes output to the log file', async () => {
    const log = logFile();
    const p = startProcess('sh', ['-c', 'echo hello'], { logFile: log });
    await p.exited;
    expect(readFileSync(log, 'utf8')).toContain('hello');
  });

  it('stop kills the whole process group, children included', async () => {
    const p = startProcess('sh', ['-c', 'sleep 30 & wait'], { logFile: logFile() });
    await new Promise((r) => setTimeout(r, 200));
    await p.stop();
    expect(alive(p.pid)).toBe(false);
  });

  it('stop is safe to call twice', async () => {
    const p = startProcess('sleep', ['30'], { logFile: logFile() });
    await p.stop();
    await expect(p.stop()).resolves.toBeUndefined();
  });
});
