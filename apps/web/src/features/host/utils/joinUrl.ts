export const joinUrlFor = (origin: string, code: string): string =>
  `${origin}/m/${encodeURIComponent(code)}`;
