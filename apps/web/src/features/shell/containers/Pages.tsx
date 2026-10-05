import { Link, useParams } from 'react-router-dom';
import { useLocale } from '../../../i18n';

export function LandingPage() {
  const { t } = useLocale();
  return (
    <>
      <h1>{t('app.name')}</h1>
      <p>{t('landing.pitch')}</p>
      <p>{t('landing.cta')}</p>
    </>
  );
}

export function SessionPlaceholderPage() {
  const { t } = useLocale();
  const { code = '' } = useParams();
  return <p>{t('session.placeholder', { code })}</p>;
}

export function NotFoundPage() {
  const { t } = useLocale();
  return (
    <>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <Link to="/">{t('notFound.home')}</Link>
    </>
  );
}
