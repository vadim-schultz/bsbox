import {
  generateCode,
  occurrences,
  type CreateSeriesRequest,
  type SeriesResponse,
} from '@bsbox/shared';
import { RRule } from 'rrule';
import { ProblemError } from '../middleware/problem';
import { Conflict, type createSeriesRepo, type createSessionsRepo, type Series } from '../repos';
import { generateEditToken, hashEditToken, verifyEditToken } from './editToken';
import { createSessionResolver } from './sessionResolver';

const RETENTION_S = 30 * 86_400;
/** Unbounded rules are expanded this far to find the "last occurrence". */
const HORIZON_S = 5 * 365 * 86_400;
const MAX_CODE_ATTEMPTS = 5;

export interface SeriesServiceDeps {
  series: ReturnType<typeof createSeriesRepo>;
  sessions: ReturnType<typeof createSessionsRepo>;
  now?: () => number;
}

export interface CreateResult {
  created: boolean;
  code: string;
  editToken?: string;
}

export type SeriesPatchInput = Partial<
  Pick<CreateSeriesRequest, 'title' | 'start' | 'durationMin' | 'tz' | 'rrule'>
>;

interface Schedule {
  tz: string;
  start: number;
  rrule: string | null;
}

function invalid(detail: string): ProblemError {
  return new ProblemError(422, 'validation_failed', detail);
}

function validateSchedule(s: Schedule): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: s.tz });
  } catch {
    throw invalid('tz is not a valid IANA time zone');
  }
  if (s.rrule === null) return;
  try {
    RRule.parseString(s.rrule);
    new RRule(RRule.parseString(s.rrule));
  } catch {
    throw invalid('rrule is not a valid RFC 5545 rule');
  }
}

function expiresAt(s: Schedule): number {
  const starts = occurrences(s.rrule, s.tz, s.start, s.start, s.start + HORIZON_S);
  return (starts[starts.length - 1] ?? s.start) + RETENTION_S;
}

export function createSeriesService(deps: SeriesServiceDeps) {
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  const resolver = createSessionResolver(deps.sessions);

  async function view(row: Series): Promise<SeriesResponse> {
    const t = now();
    const session = await resolver.resolve(row, t);
    if (!session) throw new ProblemError(410, 'expired');
    return {
      code: row.code,
      title: row.title,
      schedule: {
        tz: row.tz,
        start: row.startUtc,
        durationMin: row.durationMin,
        rrule: row.rrule,
      },
      session,
      serverTime: t,
    };
  }

  async function requireSeries(code: string): Promise<Series> {
    const row = await deps.series.getByCode(code);
    if (!row) throw new ProblemError(404, 'series_not_found');
    return row;
  }

  async function insert(input: CreateSeriesRequest, editToken: string): Promise<string> {
    const editTokenHash = await hashEditToken(editToken);
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = generateCode();
      try {
        await deps.series.create({
          code,
          title: input.title ?? null,
          source: input.source,
          externalKey: input.externalKey ?? null,
          tz: input.tz,
          startUtc: input.start,
          durationMin: input.durationMin,
          rrule: input.rrule ?? null,
          editTokenHash,
          createdAt: now(),
          expiresAt: expiresAt({ tz: input.tz, start: input.start, rrule: input.rrule ?? null }),
        });
        return code;
      } catch (err) {
        if (!(err instanceof Conflict)) throw err;
        if (input.externalKey && (await deps.series.getByExternalKey(input.externalKey))) throw err;
      }
    }
    throw new Error('could not allocate a unique series code');
  }

  return {
    async create(input: CreateSeriesRequest): Promise<CreateResult> {
      validateSchedule({ tz: input.tz, start: input.start, rrule: input.rrule ?? null });
      if (input.externalKey) {
        const existing = await deps.series.getByExternalKey(input.externalKey);
        if (existing) return { created: false, code: existing.code };
      }
      const editToken = generateEditToken();
      try {
        return { created: true, code: await insert(input, editToken), editToken };
      } catch (err) {
        // Lost a race on external_key: behave like the idempotent path.
        const existing = input.externalKey
          ? await deps.series.getByExternalKey(input.externalKey)
          : null;
        if (err instanceof Conflict && existing) return { created: false, code: existing.code };
        throw err;
      }
    },

    async get(code: string): Promise<SeriesResponse> {
      return view(await requireSeries(code));
    },

    async patch(
      code: string,
      editToken: string | undefined,
      patch: SeriesPatchInput,
    ): Promise<SeriesResponse> {
      if (!editToken) throw new ProblemError(401, 'missing_edit_token');
      const row = await requireSeries(code);
      if (!(await verifyEditToken(editToken, row.editTokenHash))) {
        throw new ProblemError(403, 'invalid_edit_token');
      }
      const merged: Schedule = {
        tz: patch.tz ?? row.tz,
        start: patch.start ?? row.startUtc,
        rrule: patch.rrule ?? row.rrule,
      };
      validateSchedule(merged);
      const updated = await deps.series.update(code, {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.durationMin !== undefined && { durationMin: patch.durationMin }),
        tz: merged.tz,
        startUtc: merged.start,
        rrule: merged.rrule,
        expiresAt: expiresAt(merged),
      });
      return view(updated ?? row);
    },
  };
}

export type SeriesService = ReturnType<typeof createSeriesService>;
