import { useCallback, useEffect, useRef, useState } from 'react';
import {
  serverMessageSchema,
  type PhaseState,
  type SessionInfo,
  type SessionResult,
  type VoteStatus,
  type WsErrorCode,
} from '@bsbox/shared';
import { createSocket, wsUrl, type SocketHandle } from '../../../lib';
import { mergeTick, type MinuteSample } from '../utils/chartData';
import { readToken, storeToken } from './token';

export type Connection = 'connecting' | 'open' | 'reconnecting';

/** Joins the session socket: phase, presence, merged timeline, optimistic own vote. */
export function useLiveSession(session: SessionInfo) {
  const [phase, setPhase] = useState<PhaseState>(session.state);
  const [timeline, setTimeline] = useState<MinuteSample[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [presence, setPresence] = useState(0);
  const [myStatus, setMyStatus] = useState<VoteStatus>('disengaged');
  const [connection, setConnection] = useState<Connection>('connecting');
  const [error, setError] = useState<WsErrorCode | null>(null);
  const handleRef = useRef<SocketHandle | null>(null);
  const tokenRef = useRef<string | undefined>(undefined);
  const confirmedRef = useRef<VoteStatus>('disengaged');

  useEffect(() => {
    const handle: SocketHandle = createSocket({
      url: wsUrl(`/sessions/${encodeURIComponent(session.id)}/ws`),
      schema: serverMessageSchema,
      onOpen: () =>
        handle.send({ type: 'hello', token: tokenRef.current ?? readToken(session.id) }),
      onClose: () => setConnection('reconnecting'),
      onMessage: (m) => {
        if (m.type === 'welcome') {
          tokenRef.current = m.token;
          storeToken(session.id, m.token);
          setPhase(m.session.state);
          setTimeline(m.timeline);
          setPresence(m.timeline.at(-1)?.present ?? 0);
          setConnection('open');
        } else if (m.type === 'tick') {
          setTimeline((t) => mergeTick(t, m));
          setPresence(m.present);
        } else if (m.type === 'phase') setPhase(m.state);
        else if (m.type === 'ended') {
          setResult(m.result);
          setPhase('ended');
        } else if (m.type === 'error') {
          setError(m.code);
          setMyStatus(confirmedRef.current);
        }
      },
    });
    handleRef.current = handle;
    return () => handle.close();
  }, [session.id]);

  const vote = useCallback(
    (status: VoteStatus) => {
      // Tapping the active card withdraws the vote.
      const next: VoteStatus = status === myStatus ? 'disengaged' : status;
      confirmedRef.current = myStatus;
      setError(null);
      setMyStatus(next);
      handleRef.current?.send({ type: 'vote', status: next });
    },
    [myStatus],
  );

  return { phase, result, timeline, presence, myStatus, vote, connection, error };
}
