import { proxyHops } from './app.setup';

describe('proxyHops', () => {
  it('defaults to one proxy (Traefik)', () => {
    expect(proxyHops(undefined)).toBe(1);
    expect(proxyHops('')).toBe(1);
    expect(proxyHops('  ')).toBe(1);
  });

  it('reads a whole number of hops', () => {
    expect(proxyHops('2')).toBe(2);
    expect(proxyHops(' 0\n')).toBe(0);
  });

  it('ignores malformed values', () => {
    expect(proxyHops('two')).toBe(1);
    expect(proxyHops('-1')).toBe(1);
    expect(proxyHops('1.5')).toBe(1);
  });
});
