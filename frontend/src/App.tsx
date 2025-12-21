import { useState } from "react";

import { PageShell } from "./app/layout/PageShell";
import { MeetingContainer } from "./features/meeting/containers/MeetingContainer";
import { SelectionContainer } from "./features/meeting/containers/SelectionContainer";
import type { VisitSession } from "./features/meeting/types/domain";

function App() {
  const [session, setSession] = useState<VisitSession | null>(null);

  const handleBackToSelection = () => {
    setSession(null);
  };

  return (
    <PageShell>
      {session ? (
        <MeetingContainer initialSession={session} onBackToSelection={handleBackToSelection} />
      ) : (
        <SelectionContainer onSessionReady={setSession} />
      )}
    </PageShell>
  );
}

export default App;
