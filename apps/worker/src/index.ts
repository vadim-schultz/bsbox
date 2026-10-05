import { createApp } from './app';
import { scheduled } from './cron';

const app = createApp();

export { SessionRoom } from './do/SessionRoom';
export default { fetch: app.fetch, scheduled };
