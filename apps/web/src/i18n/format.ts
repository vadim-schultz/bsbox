import type { Locale } from './locale';

export const formatDate = (date: Date, locale: Locale): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date);

export const formatTime = (date: Date, locale: Locale): string =>
  new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date);

export const formatNumber = (value: number, locale: Locale): string =>
  new Intl.NumberFormat(locale).format(value);

export const formatPercent = (value: number, locale: Locale): string =>
  new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value);
