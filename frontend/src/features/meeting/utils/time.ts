import { parseISO } from "date-fns";
import { formatInTimeZone, utcToZonedTime } from "date-fns-tz";

const getBrowserTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

const toDate = (value: string | Date) =>
  typeof value === "string" ? parseISO(value) : value;

export const toLocalDate = (
  value: string | Date,
  timeZone?: string
) => {
  const zone = timeZone ?? getBrowserTimeZone();
  return utcToZonedTime(toDate(value), zone);
};

export const formatTimeLocal = (
  value: string | Date,
  timeZone?: string,
  pattern = "HH:mm"
) => {
  const zone = timeZone ?? getBrowserTimeZone();
  return formatInTimeZone(toDate(value), zone, pattern);
};

export const formatTimespan = (
  start?: string | Date,
  end?: string | Date,
  timeZone?: string
) => {
  if (!start || !end) return "Loading meeting time...";
  const zone = timeZone ?? getBrowserTimeZone();
  return `${formatTimeLocal(start, zone)} – ${formatTimeLocal(end, zone)}`;
};

