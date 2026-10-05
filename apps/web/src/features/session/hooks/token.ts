const tokenKey = (sessionId: string) => `bsbox.token.${sessionId}`;

export function readToken(sessionId: string): string | undefined {
  try {
    return localStorage.getItem(tokenKey(sessionId)) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Best effort; callers keep an in-memory copy for blocked storage. */
export function storeToken(sessionId: string, token: string): void {
  try {
    localStorage.setItem(tokenKey(sessionId), token);
  } catch {
    /* storage blocked */
  }
}
