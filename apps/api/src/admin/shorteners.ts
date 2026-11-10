/**
 * Link shorteners, matched on the registered domain. A scam behind one of them is
 * reported to the shortener.
 */
export const SHORTENERS: readonly string[] = [
  'bit.ly',
  't.ly',
  'tinyurl.com',
  'cutt.ly',
  'shorturl.at',
  'is.gd',
  'rb.gy',
  'ow.ly',
  's.id',
  'tiny.cc',
  'rebrand.ly',
  't.co',
  'goo.su',
  'qrco.de',
  'v.gd',
  'dub.mn',
  'dub.sh',
  'buff.ly',
  'lnkd.in',
  'bl.ink',
  'clck.ru',
  'kutt.it',
];

export function shortenerOf(registeredDomain: string): string | null {
  const domain = registeredDomain.toLowerCase();
  return SHORTENERS.includes(domain) ? domain : null;
}
