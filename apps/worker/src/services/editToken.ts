const enc = new TextEncoder();

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Opaque 256-bit random token, base64url. */
export function generateEditToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashEditToken(token: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(token))));
}

/** Constant-time comparison of the token's sha256 against the stored hash. */
export async function verifyEditToken(token: string, storedHash: string): Promise<boolean> {
  const actual = enc.encode(await hashEditToken(token));
  const expected = enc.encode(storedHash);
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ (expected[i] ?? 0);
  return diff === 0;
}
