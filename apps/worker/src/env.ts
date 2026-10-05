export interface Env {
  DB: D1Database;
  SERIES_RATE_LIMITER: RateLimit;
  SESSION_ROOM: DurableObjectNamespace;
  /** HMAC key for participant tokens; a Worker secret in deployed environments (M5). */
  TOKEN_HMAC_KEY: string;
}
