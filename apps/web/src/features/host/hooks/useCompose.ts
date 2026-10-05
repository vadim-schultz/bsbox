import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '../../../i18n';
import {
  createSeries,
  insertIntoBody,
  loadStored,
  readItem,
  saveStored,
  syncSeries,
} from '../services';
import type { ComposeState, StoredSeries, SyncState } from '../types';
import { inviteBlockHtml, joinUrlFor, toCreateRequest, toSchedule } from '../utils';

/** Compose state machine: not_added, adding, added, error. Guards against double submits. */
export function useCompose() {
  const { locale } = useLocale();
  const [state, setState] = useState<ComposeState>({ status: 'not_added' });
  const [sync, setSync] = useState<SyncState>('idle');
  const stored = useRef<StoredSeries | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let live = true;
    loadStored()
      .then((found) => {
        if (!live || !found) return;
        stored.current = found;
        setState({
          status: 'added',
          code: found.code,
          joinUrl: joinUrlFor(location.origin, found.code),
        });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const add = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setState({ status: 'adding' });
    try {
      const created = await createSeries(toCreateRequest(await readItem()));
      await insertIntoBody(inviteBlockHtml(created.joinUrl, locale));
      const keep = { code: created.code, editToken: created.editToken };
      await saveStored(keep);
      stored.current = keep;
      setState({ status: 'added', code: created.code, joinUrl: created.joinUrl });
    } catch {
      setState({ status: 'error' });
    } finally {
      busy.current = false;
    }
  }, [locale]);

  const syncTimes = useCallback(async () => {
    const current = stored.current;
    if (!current?.editToken || busy.current) {
      if (!current?.editToken) setSync('error');
      return;
    }
    busy.current = true;
    setSync('syncing');
    try {
      await syncSeries(current.code, current.editToken, toSchedule(await readItem()));
      setSync('synced');
    } catch {
      setSync('error');
    } finally {
      busy.current = false;
    }
  }, []);

  return { state, sync, add, syncTimes };
}
