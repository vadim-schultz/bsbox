import { TextLink } from '../../../../components';
import { useState } from 'react';
import { Button } from '@fluentui/react-components';
import qrcode from 'qrcode-generator';
import { useLocale } from '../../../../i18n';

const CELL = 4;
const MARGIN = 2;

function QrCode({ text, label }: { text: string; label: string }) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const size = (count + MARGIN * 2) * CELL;
  const cells: string[] = [];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        cells.push(`M${(col + MARGIN) * CELL} ${(row + MARGIN) * CELL}h${CELL}v${CELL}h-${CELL}z`);
      }
    }
  }
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} width={160} height={160}>
      <rect width={size} height={size} fill="#fff" />
      <path d={cells.join('')} fill="#000" />
    </svg>
  );
}

/** Copy link and QR so others can join from a phone. */
export function ShareLink({ joinUrl }: { joinUrl: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  };
  return (
    <section aria-label={t('host.teams.share.title')}>
      <h2>{t('host.teams.share.title')}</h2>
      <p>
        <TextLink href={joinUrl}>{joinUrl}</TextLink>
      </p>
      <Button onClick={() => void copy()}>{t('host.compose.copy')}</Button>
      <p role="status">
        {copied === 'copied' ? t('host.compose.copied') : null}
        {copied === 'failed' ? t('result.share.fallback') : null}
      </p>
      <QrCode text={joinUrl} label={t('host.teams.share.qr', { url: joinUrl })} />
    </section>
  );
}
