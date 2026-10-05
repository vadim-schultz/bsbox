import { Hono } from 'hono';

export const healthController = new Hono().get('/health', (c) => c.json({ status: 'ok' }));
