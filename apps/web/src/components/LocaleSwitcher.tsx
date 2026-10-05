import { Select } from '@fluentui/react-components';
import { LOCALES, useLocale, type Locale } from '../i18n';

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale();
  return (
    <Select
      aria-label={t('locale.label')}
      value={locale}
      onChange={(_, data) => setLocale(data.value as Locale)}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {t(`locale.${l}`)}
        </option>
      ))}
    </Select>
  );
}
