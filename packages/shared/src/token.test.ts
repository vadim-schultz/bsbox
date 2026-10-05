import { describe, expect, it } from 'vitest';
import { signToken, verifyToken } from './token';

const secret = 'test-secret';
const payload = { pid: 'p1', sessionId: 'ABC-100', exp: 2_000 };

describe('token', () => {
  it('round-trips', async () => {
    const t = await signToken(payload, secret);
    expect(await verifyToken(t, secret, 'ABC-100', 1_000)).toEqual(payload);
  });

  it('rejects tampered, expired, other-session and wrong-secret tokens', async () => {
    const t = await signToken(payload, secret);
    const [body, sig] = t.split('.') as [string, string];
    const flipped = sig.slice(0, -2) + (sig.endsWith('AA') ? 'BB' : 'AA');
    expect(await verifyToken(`${body}.${flipped}`, secret, 'ABC-100', 1_000)).toBeNull();
    expect(await verifyToken(t, secret, 'ABC-100', 2_001)).toBeNull();
    expect(await verifyToken(t, secret, 'XYZ-100', 1_000)).toBeNull();
    expect(await verifyToken(t, 'other', 'ABC-100', 1_000)).toBeNull();
    expect(await verifyToken('garbage', secret, 'ABC-100', 1_000)).toBeNull();
  });
});
