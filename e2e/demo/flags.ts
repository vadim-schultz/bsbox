export interface Flags {
  keepRunning: boolean;
  headless: boolean;
  reuse: boolean;
}

const NAMES: Record<string, keyof Flags> = {
  '--keep-running': 'keepRunning',
  '--headless': 'headless',
  '--reuse': 'reuse',
};

export function parseFlags(argv: readonly string[]): Flags {
  const flags: Flags = { keepRunning: false, headless: false, reuse: false };
  for (const arg of argv.filter((a) => a !== '--')) {
    const key = NAMES[arg];
    if (!key) throw new Error(`unknown flag ${arg}`);
    flags[key] = true;
  }
  return flags;
}
