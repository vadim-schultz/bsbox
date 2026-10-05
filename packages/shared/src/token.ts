export interface TokenPayload {
  pid: string;
  sessionId: string;
  /** Expiry, epoch seconds. */
  exp: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const s = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

function hmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  );
}

/** Format: base64url(pid.sessionId.exp).base64url(hmac). */
export async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  if (payload.pid.includes('.') || payload.sessionId.includes('.')) {
    throw new RangeError('pid and sessionId must not contain "."');
  }
  const body = toBase64Url(enc.encode(`${payload.pid}.${payload.sessionId}.${payload.exp}`));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), enc.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

/** Returns the payload when signature, session and expiry are valid; otherwise null. */
export async function verifyToken(
  token: string,
  secret: string,
  sessionId: string,
  nowSec: number,
): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts as [string, string];
    const ok = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret, 'verify'),
      fromBase64Url(sig),
      enc.encode(body),
    );
    if (!ok) return null;
    const [pid, sid, expText] = dec.decode(fromBase64Url(body)).split('.');
    const exp = Number(expText);
    if (!pid || sid !== sessionId || !Number.isFinite(exp) || exp < nowSec) return null;
    return { pid, sessionId: sid, exp };
  } catch {
    return null;
  }
}
