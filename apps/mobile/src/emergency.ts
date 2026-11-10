/** 112 works across the EU, the rest of the EEA, Switzerland, the UK and Türkiye. */
const EUROPE_112 = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'CH', 'TR',
];

/** Where people know another number first, show that one. */
const OTHER: Record<string, string> = {
  US: '911',
  CA: '911',
  GB: '999',
  AU: '000',
  NZ: '111',
};

/**
 * The emergency number for the region the phone is set to, such as "TR" or "US";
 * null when we are not sure, so the app says "your local emergency number" instead.
 */
export function emergencyNumber(region: string | null | undefined): string | null {
  const code = region?.trim().toUpperCase();
  if (!code) {
    return null;
  }
  return OTHER[code] ?? (EUROPE_112.includes(code) ? '112' : null);
}
