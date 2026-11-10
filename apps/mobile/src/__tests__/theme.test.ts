import { LARGE_TEXT_SCALE, resolveTheme } from '../theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('resolveTheme', () => {
  it('follows the phone unless a theme is chosen', () => {
    expect(resolveTheme('system', 'dark').dark).toBe(true);
    expect(resolveTheme('system', 'light').dark).toBe(false);
    expect(resolveTheme('light', 'dark').dark).toBe(false);
    expect(resolveTheme('dark', 'light').dark).toBe(true);
  });

  it('keeps font sizes as they are unless large text is on', () => {
    expect(resolveTheme('system', 'light').font(16)).toBe(16);
    expect(resolveTheme('system', 'light', true).font(16)).toBe(20);
    expect(resolveTheme('dark', 'light', true).font(15)).toBe(Math.round(15 * LARGE_TEXT_SCALE));
  });
});
