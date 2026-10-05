export const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 10;

/** 10-char Crockford base32 code (~50 bits), crypto-random. 32 symbols so masking is unbiased. */
export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let out = '';
  for (const b of bytes) out += CROCKFORD.charAt(b & 31);
  return out;
}

export function isValidCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  for (const ch of code) if (!CROCKFORD.includes(ch)) return false;
  return true;
}
