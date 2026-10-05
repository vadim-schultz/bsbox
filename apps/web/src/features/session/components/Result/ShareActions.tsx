import { useState } from 'react';
import { Button } from '@fluentui/react-components';
import { useLocale } from '../../../../i18n';

type Copy = { status: 'idle' } | { status: 'copied' } | { status: 'failed'; text: string };

export interface ShareActionsProps {
  summary: string;
  link: string;
}

export function ShareActions({ summary, link }: ShareActionsProps) {
  const { t } = useLocale();
  const [copy, setCopy] = useState<Copy>({ status: 'idle' });
  const run = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopy({ status: 'copied' });
    } catch {
      setCopy({ status: 'failed', text });
    }
  };
  return (
    <div>
      <Button onClick={() => void run(summary)}>{t('result.share.copySummary')}</Button>
      <Button onClick={() => void run(link)}>{t('result.share.copyLink')}</Button>
      {copy.status === 'copied' ? <p role="status">{t('result.share.copied')}</p> : null}
      {copy.status === 'failed' ? (
        <div>
          <p role="alert">{t('result.share.fallback')}</p>
          <textarea
            readOnly
            rows={4}
            value={copy.text}
            aria-label={t('result.share.copySummary')}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      ) : null}
    </div>
  );
}
