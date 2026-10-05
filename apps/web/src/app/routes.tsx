import { Route, Routes } from 'react-router-dom';
import { Layout, LandingPage, NotFoundPage, SessionPlaceholderPage } from '../features/shell';

export function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/m/:code" element={<SessionPlaceholderPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
