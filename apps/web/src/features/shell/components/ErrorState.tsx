import { Button } from '@fluentui/react-components';
import { useLocale } from '../../../i18n';

export interface ErrorStateProps {
  title: string;
  body: string;
  onRetry?: () => void;
}

export function ErrorState({ title, body, onRetry }: ErrorStateProps) {
  const { t } = useLocale();
  return (
    <div role="alert">
      <h1>{title}</h1>
      <p>{body}</p>
      {onRetry ? <Button onClick={onRetry}>{t('error.retry')}</Button> : null}
    </div>
  );
}
