import type { D1Migration } from '@cloudflare/vitest-pool-workers/config';

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database;
    SERIES_RATE_LIMITER: RateLimit;
    SESSION_ROOM: DurableObjectNamespace;
    TOKEN_HMAC_KEY: string;
    TEST_MIGRATIONS: D1Migration[];
  }
}
