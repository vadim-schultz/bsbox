import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync } from 'node:fs';
import { dirname } from 'node:path';

const GRACE_MS = 3000;

export interface ProcOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  logFile: string;
}

export interface Proc {
  pid: number;
  /** Resolves when the process has exited. */
  exited: Promise<void>;
  /** Terminates the whole process group (shell script, wrangler, workerd...), then SIGKILLs. */
  stop: () => Promise<void>;
}

/** Spawns a detached process group with stdout and stderr appended to a log file. */
export function startProcess(cmd: string, args: string[], o: ProcOptions): Proc {
  mkdirSync(dirname(o.logFile), { recursive: true });
  const fd = openSync(o.logFile, 'a');
  const child = spawn(cmd, args, {
    cwd: o.cwd,
    env: { ...process.env, ...o.env },
    detached: true,
    stdio: ['ignore', fd, fd],
  });
  closeSync(fd);
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  const stop = async () => {
    killGroup(child.pid, 'SIGTERM');
    await Promise.race([exited, new Promise((r) => setTimeout(r, GRACE_MS))]);
    killGroup(child.pid, 'SIGKILL');
  };
  return { pid: child.pid ?? -1, exited, stop };
}

function killGroup(pid: number | undefined, signal: NodeJS.Signals): void {
  if (pid === undefined) return;
  try {
    process.kill(-pid, signal);
  } catch {
    // already gone
  }
}
