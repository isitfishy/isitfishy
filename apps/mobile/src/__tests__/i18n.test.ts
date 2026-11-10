import { LANG_NAMES, LANGS, pickLang, t } from '../i18n';

/** The shape of a value: object keys and array lengths, with every string reduced to "string". */
function shape(value: unknown): unknown {
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, shape((value as Record<string, unknown>)[key])]),
    );
  }
  return typeof value;
}

/** Every string in a value with the path that leads to it, such as "helpSteps.4.body". */
function leaves(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      leaves(child, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

describe('strings', () => {
  it('offers exactly six languages', () => {
    expect([...LANGS].sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'tr']);
  });

  it.each(LANGS)('%s has exactly the keys English has, at every level', (lang) => {
    expect(shape(t(lang))).toEqual(shape(t('en')));
  });

  it.each(LANGS)('%s has no empty strings', (lang) => {
    for (const [path, text] of leaves(t(lang))) {
      expect({ path, empty: text.trim() === '' }).toEqual({ path, empty: false });
    }
  });

  it.each(LANGS)('%s keeps the numbers, phone numbers and addresses English has', (lang) => {
    const translated = new Map(leaves(t(lang)));
    for (const [path, text] of leaves(t('en'))) {
      const keep = text.match(/\d+|[\w-]+(?:\.[\w-]+)+(?:\/\w+)?/g) ?? [];
      for (const token of keep) {
        expect({ path, contains: translated.get(path)?.includes(token) }).toEqual({
          path,
          contains: true,
        });
      }
    }
  });

  it.each(LANGS)('%s names the emergency number, or the local one when unknown', (lang) => {
    expect(t(lang).helpEmergency('911')).toContain('911');
    expect(t(lang).helpEmergency(null)).not.toMatch(/\d/);
  });

  it('names every language in that language', () => {
    expect(LANG_NAMES).toEqual({
      tr: 'Türkçe',
      en: 'English',
      de: 'Deutsch',
      es: 'Español',
      fr: 'Français',
      it: 'Italiano',
    });
  });
});

describe('pickLang', () => {
  it('maps a device language to one the app is written in', () => {
    expect(pickLang('tr')).toBe('tr');
    expect(pickLang('TR')).toBe('tr');
    expect(pickLang('en')).toBe('en');
    expect(pickLang('de')).toBe('de');
    expect(pickLang('es')).toBe('es');
    expect(pickLang('fr')).toBe('fr');
    expect(pickLang('it')).toBe('it');
  });

  it('ignores the region part of a locale', () => {
    expect(pickLang('de-AT')).toBe('de');
    expect(pickLang('fr_CA')).toBe('fr');
    expect(pickLang('es-419')).toBe('es');
    expect(pickLang('pt-BR')).toBe('en');
  });

  it('falls back to English for anything else', () => {
    expect(pickLang('zh')).toBe('en');
    expect(pickLang('nl')).toBe('en');
    expect(pickLang('')).toBe('en');
    expect(pickLang(null)).toBe('en');
    expect(pickLang(undefined)).toBe('en');
  });
});
