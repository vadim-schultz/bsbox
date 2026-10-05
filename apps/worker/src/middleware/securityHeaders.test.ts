import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

const get = (path: string) => createApp().request(`https://bsbox.test${path}`, {}, env);

describe('security headers', () => {
  it('every response carries the baseline headers', async () => {
    for (const path of ['/api/health', '/api/nope', '/host/compose']) {
      const res = await get(path);
      expect(res.headers.get('strict-transport-security')).toContain('max-age=');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    }
  });

  it('host routes allow framing only from Outlook and Teams origins', async () => {
    const csp = (await get('/host/compose')).headers.get('content-security-policy') ?? '';
    expect(csp).toMatch(/frame-ancestors [^;]*https:\/\/outlook\.office\.com/);
    expect(csp).toMatch(/frame-ancestors [^;]*https:\/\/teams\.microsoft\.com/);
    expect(csp).not.toMatch(/frame-ancestors [^;]*\*\s*(;|$)/);
    expect(csp).toContain('https://appsforoffice.microsoft.com');
    expect(csp).toContain('https://res.cdn.office.net');
  });

  it("non-host pages respond with frame-ancestors 'none'", async () => {
    for (const path of ['/api/health', '/m/ABC', '/hostile']) {
      const csp = (await get(path)).headers.get('content-security-policy') ?? '';
      expect(csp).toContain("frame-ancestors 'none'");
    }
  });

  it('never allows unsafe script or style sources', async () => {
    for (const path of ['/api/health', '/host/read']) {
      const csp = (await get(path)).headers.get('content-security-policy') ?? '';
      expect(csp).not.toMatch(/unsafe-(inline|eval)/);
    }
  });
});
