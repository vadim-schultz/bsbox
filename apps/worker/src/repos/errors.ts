export class Conflict extends Error {
  readonly code = 'conflict';
  constructor(message: string) {
    super(message);
    this.name = 'Conflict';
  }
}

export function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e instanceof Error; e = e.cause) {
    if (/UNIQUE constraint failed/i.test(e.message)) return true;
  }
  return false;
}
