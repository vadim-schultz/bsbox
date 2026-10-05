import { useEffect, useState } from 'react';
import { serverMessageSchema, type PhaseState, type SessionInfo } from '@bsbox/shared';
import { createSocket, wsUrl, type SocketHandle } from '../../../lib';

const tokenKey = (sessionId: string) => `bsbox.token.${sessionId}`;

function readToken(sessionId: string): string | undefined {
  try {
    return localStorage.getItem(tokenKey(sessionId)) ?? undefined;
  } catch {
    return undefined;
  }
}

function storeToken(sessionId: string, token: string): void {
  try {
    localStorage.setItem(tokenKey(sessionId), token);
  } catch {
    /* storage blocked; the in-memory flow arrives with the live chapter */
  }
}

/** Joins the session socket so presence and phase changes arrive without reload. */
export function useSessionPhase(session: SessionInfo) {
  const [phase, setPhase] = useState<PhaseState>(session.state);
  const [present, setPresent] = useState(0);

  useEffect(() => {
    const handle: SocketHandle = createSocket({
      url: wsUrl(`/sessions/${encodeURIComponent(session.id)}/ws`),
      schema: serverMessageSchema,
      onOpen: () => handle.send({ type: 'hello', token: readToken(session.id) }),
      onMessage: (m) => {
        if (m.type === 'welcome') {
          storeToken(session.id, m.token);
          setPhase(m.session.state);
          setPresent(m.timeline.at(-1)?.present ?? 0);
        } else if (m.type === 'tick') setPresent(m.present);
        else if (m.type === 'phase') setPhase(m.state);
        else if (m.type === 'ended') setPhase('ended');
      },
    });
    return () => handle.close();
  }, [session.id]);

  return { phase, present };
}
