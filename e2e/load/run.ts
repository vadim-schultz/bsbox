import { evaluate, type Evaluation, type Limits } from './stats';

export interface LoadConfig {
  baseUrl: string;
  clients: number;
  durationS: number;
  voteEveryMs: number;
  limits: Limits;
  log: (line: string) => void;
}

export interface LoadReport {
  exitCode: 0 | 1;
  evaluation: Evaluation;
  clients: number;
  votes: number;
  ticks: number;
}

interface Tally {
  latenciesMs: number[];
  attempts: number;
  errors: number;
  votes: number;
  ticks: number;
}

const STATUSES = ['engaged', 'speaking', 'disengaged'] as const;

async function createLiveSession(baseUrl: string, durationS: number): Promise<string> {
  const start = Math.floor(Date.now() / 1000) - 30;
  const durationMin = Math.max(5, Math.ceil((durationS + 60) / 60));
  const created = await fetch(`${baseUrl}/api/series`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ start, durationMin, tz: 'UTC', source: 'web', title: 'load' }),
  });
  if (!created.ok) throw new Error(`series create failed: ${created.status}`);
  const { code } = (await created.json()) as { code: string };
  const view = await fetch(`${baseUrl}/api/series/${code}`);
  if (!view.ok) throw new Error(`series read failed: ${view.status}`);
  return ((await view.json()) as { session: { id: string } }).session.id;
}

/** One simulated participant: joins, votes on a timer, times vote-to-next-tick. */
function startClient(url: string, voteEveryMs: number, tally: Tally): { stop: () => void } {
  tally.attempts += 1;
  let welcomed = false;
  let stopping = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const pending: number[] = [];
  const ws = new WebSocket(url);
  const fail = () => {
    if (!stopping) tally.errors += 1;
  };
  ws.onopen = () => ws.send(JSON.stringify({ type: 'hello' }));
  ws.onerror = fail;
  ws.onclose = () => {
    clearInterval(timer);
    if (!welcomed) fail();
  };
  ws.onmessage = (event) => {
    const msg = JSON.parse(String(event.data)) as { type: string };
    if (msg.type === 'welcome') {
      welcomed = true;
      timer = setInterval(() => {
        tally.attempts += 1;
        tally.votes += 1;
        pending.push(performance.now());
        const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
        ws.send(JSON.stringify({ type: 'vote', status }));
      }, voteEveryMs);
    } else if (msg.type === 'tick') {
      tally.ticks += 1;
      const now = performance.now();
      for (const sent of pending.splice(0)) tally.latenciesMs.push(now - sent);
    } else if (msg.type === 'error') fail();
  };
  return {
    stop: () => {
      stopping = true;
      clearInterval(timer);
      ws.close();
    },
  };
}

export async function runLoad(config: LoadConfig): Promise<LoadReport> {
  const tally: Tally = { latenciesMs: [], attempts: 0, errors: 0, votes: 0, ticks: 0 };
  const sessionId = await createLiveSession(config.baseUrl, config.durationS);
  const wsBase = config.baseUrl.replace(/^http/, 'ws');
  const url = `${wsBase}/api/sessions/${encodeURIComponent(sessionId)}/ws`;
  config.log(`session ${sessionId}: ${config.clients} clients for ${config.durationS}s`);
  const clients: { stop: () => void }[] = [];
  for (let i = 0; i < config.clients; i++) {
    clients.push(startClient(url, config.voteEveryMs, tally));
    await new Promise((r) => setTimeout(r, 5));
  }
  await new Promise((r) => setTimeout(r, config.durationS * 1000));
  clients.forEach((c) => c.stop());
  const evaluation = evaluate(tally, config.limits);
  config.log(
    `votes=${tally.votes} ticks=${tally.ticks} p95=${evaluation.p95Ms.toFixed(0)}ms ` +
      `errorRate=${evaluation.errorRate.toFixed(4)}`,
  );
  evaluation.failures.forEach((f) => config.log(`FAIL: ${f}`));
  return {
    exitCode: evaluation.ok ? 0 : 1,
    evaluation,
    clients: config.clients,
    votes: tally.votes,
    ticks: tally.ticks,
  };
}
