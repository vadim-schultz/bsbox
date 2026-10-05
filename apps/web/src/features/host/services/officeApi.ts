import type { ItemRecurrence, ItemSnapshot, StoredSeries } from '../types';

/** The only module that touches Office.js. Shapes below are the minimal slice BSBox uses. */
interface AsyncResult<T> {
  status: string;
  value: T;
  error?: { message: string };
}
type Callback<T> = (result: AsyncResult<T>) => void;
interface Getter<T> {
  getAsync(cb: Callback<T>): void;
}
interface CustomProperties {
  get(name: string): unknown;
  set(name: string, value: string): void;
  saveAsync(cb: Callback<void>): void;
}
interface MailItem {
  subject: Getter<string>;
  start: Getter<Date>;
  end: Getter<Date>;
  recurrence?: Getter<ItemRecurrence | null>;
  body: {
    getAsync(type: string, cb: Callback<string>): void;
    setSelectedDataAsync(data: string, opts: { coercionType: string }, cb: Callback<void>): void;
  };
  loadCustomPropertiesAsync(cb: Callback<CustomProperties>): void;
}
interface OfficeGlobal {
  context: {
    displayLanguage?: string;
    mailbox?: { item?: MailItem };
    requirements?: { isSetSupported(name: string, version: string): boolean };
  };
}

export class HostUnavailableError extends Error {
  constructor() {
    super('Office.js is not available');
    this.name = 'HostUnavailableError';
  }
}

const officeGlobal = (): OfficeGlobal | undefined =>
  (globalThis as { Office?: OfficeGlobal }).Office;

function item(): MailItem {
  const found = officeGlobal()?.context.mailbox?.item;
  if (!found) throw new HostUnavailableError();
  return found;
}

function call<T>(run: (cb: Callback<T>) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    run((result) => {
      if (result.status === 'succeeded') resolve(result.value);
      else reject(new Error(result.error?.message ?? 'Office call failed'));
    });
  });
}

const CODE_KEY = 'bsbox.code';
const TOKEN_KEY = 'bsbox.token';

export function isHostAvailable(): boolean {
  return Boolean(officeGlobal()?.context.mailbox?.item);
}

export function displayLanguage(): string | undefined {
  return officeGlobal()?.context.displayLanguage;
}

/** Spike S2: OnAppointmentSend (Smart Alerts) needs Mailbox 1.14. Without it, "Sync times" is manual. */
export function supportsSendSync(): boolean {
  return officeGlobal()?.context.requirements?.isSetSupported('Mailbox', '1.14') ?? false;
}

export async function readItem(): Promise<ItemSnapshot> {
  const it = item();
  const [subject, start, end, recurrence, bodyText] = await Promise.all([
    call<string>((cb) => it.subject.getAsync(cb)),
    call<Date>((cb) => it.start.getAsync(cb)),
    call<Date>((cb) => it.end.getAsync(cb)),
    it.recurrence
      ? call<ItemRecurrence | null>((cb) => it.recurrence!.getAsync(cb))
      : Promise.resolve(null),
    // Spike S1: the Teams join URL is only reachable by reading the body text.
    call<string>((cb) => it.body.getAsync('text', cb)).catch(() => ''),
  ]);
  return { subject, start, end, recurrence: recurrence ?? null, bodyText };
}

export function insertIntoBody(html: string): Promise<void> {
  const it = item();
  return call<void>((cb) => it.body.setSelectedDataAsync(html, { coercionType: 'html' }, cb));
}

export async function loadStored(): Promise<StoredSeries | null> {
  const it = item();
  const props = await call<CustomProperties>((cb) => it.loadCustomPropertiesAsync(cb));
  const code = props.get(CODE_KEY);
  if (typeof code !== 'string' || code === '') return null;
  const token = props.get(TOKEN_KEY);
  return typeof token === 'string' && token !== '' ? { code, editToken: token } : { code };
}

export async function saveStored(stored: StoredSeries): Promise<void> {
  const it = item();
  const props = await call<CustomProperties>((cb) => it.loadCustomPropertiesAsync(cb));
  props.set(CODE_KEY, stored.code);
  if (stored.editToken) props.set(TOKEN_KEY, stored.editToken);
  await call<void>((cb) => props.saveAsync(cb));
}
