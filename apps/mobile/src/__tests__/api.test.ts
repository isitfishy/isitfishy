import { resolveApiUrl } from '../api';

describe('resolveApiUrl', () => {
  it('prefers an explicit URL', () => {
    expect(resolveApiUrl('https://api.isitfishy.app', '192.0.2.42:8081')).toBe(
      'https://api.isitfishy.app',
    );
  });

  it('uses the dev server host so a phone on the same network reaches the API', () => {
    expect(resolveApiUrl(undefined, '192.0.2.42:8081')).toBe('http://192.0.2.42:3000');
  });

  it('falls back to localhost', () => {
    expect(resolveApiUrl(undefined, undefined)).toBe('http://localhost:3000');
    expect(resolveApiUrl('', undefined)).toBe('http://localhost:3000');
  });
});
