import { useState } from 'react';
import { ComposeView } from '../components';
import { useCompose } from '../hooks';

export function ComposePane() {
  const { state, sync, add, syncTimes } = useCompose();
  const [copied, setCopied] = useState(false);
  const copy = (url: string) => {
    navigator.clipboard
      ?.writeText(url)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };
  return (
    <ComposeView
      state={state}
      sync={sync}
      onAdd={add}
      onSync={syncTimes}
      onCopy={copy}
      copied={copied}
    />
  );
}
