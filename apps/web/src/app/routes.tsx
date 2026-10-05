import { Route, Routes, useParams } from 'react-router-dom';
import { Layout, LandingPage, NotFoundPage } from '../features/shell';
import { SessionContainer } from '../features/session';

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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
