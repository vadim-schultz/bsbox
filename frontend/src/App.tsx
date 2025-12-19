import { PageShell } from "./app/layout/PageShell";
import { MeetingContainer } from "./features/meeting/containers/MeetingContainer";

function App() {
  return (
    <PageShell>
      <MeetingContainer />
    </PageShell>
  );
}

export default App;
