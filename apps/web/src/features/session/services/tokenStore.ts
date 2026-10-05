/**
 * Spike S4 outcome: Teams web can block third-party storage. Order is localStorage, then an
 * in-memory copy, then a URL fragment that survives a panel reload.
 */
const tokenKey = (sessionId: string) => `bsbox.token.${sessionId}`;
const memory = new Map<string, string>();

/** Test seam: simulates losing in-memory state (a reload). */
export function resetTokenMemory(): void {
  memory.clear();
}

function fragmentParams(): URLSearchParams {
  return new URLSearchParams(location.hash.replace(/^#/, ''));
}

function writeFragment(sessionId: string, token: string): void {
  const params = fragmentParams();
  params.set(tokenKey(sessionId), token);
  try {
    history.replaceState(null, '', `${location.pathname}${location.search}#${params}`);
  } catch {
    /* history blocked; memory still holds the token */
  }
}

export function readToken(sessionId: string): string | undefined {
  try {
    const stored = localStorage.getItem(tokenKey(sessionId));
    if (stored) return stored;
  } catch {
    /* storage blocked */
  }
  return memory.get(sessionId) ?? fragmentParams().get(tokenKey(sessionId)) ?? undefined;
}

export function storeToken(sessionId: string, token: string): void {
  try {
    localStorage.setItem(tokenKey(sessionId), token);
    return;
  } catch {
    /* storage blocked: fall through */
  }
  memory.set(sessionId, token);
  writeFragment(sessionId, token);
}
