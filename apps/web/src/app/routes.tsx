import { Route, Routes, useParams } from 'react-router-dom';
import { Layout, LandingPage, NotFoundPage } from '../features/shell';
import { SessionContainer } from '../features/session';
import { ComposePane, HostLocale, ReadPane, TeamsConfig, TeamsPanel } from '../features/host';

function SessionRoute() {
  const { code = '' } = useParams();
  return <SessionContainer code={code} />;
}

export function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/m/:code" element={<SessionRoute />} />
        <Route
          path="/host/compose"
          element={
            <HostLocale>
              <ComposePane />
            </HostLocale>
          }
        />
        <Route
          path="/host/read"
          element={
            <HostLocale>
              <ReadPane />
            </HostLocale>
          }
        />
        <Route path="/host/teams" element={<TeamsPanel />} />
        <Route path="/host/teams/config" element={<TeamsConfig />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
