import type { CheckResult } from '@isitfishy/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addToHistory, type HistoryEntry, loadHistory, preview } from '../history';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const result: CheckResult = {
  verdict: 'low',
  unverified: false,
  link: null,
  destination: null,
  reasons: [],
};
const entry = (input: string, checkedAt: string): HistoryEntry => ({ input, checkedAt, result });

describe('addToHistory', () => {
  it('puts the newest check first and drops an older copy of the same input', () => {
    const list = [entry('a.example', '1'), entry('b.example', '2')];
    expect(addToHistory(list, entry('b.example', '3')).map((e) => e.checkedAt)).toEqual(['3', '1']);
  });

  it('keeps at most the limit', () => {
    const list = [entry('a', '1'), entry('b', '2')];
    expect(addToHistory(list, entry('c', '3'), 2).map((e) => e.input)).toEqual(['c', 'a']);
  });
});

describe('preview', () => {
  it('shows the first line, shortened', () => {
    expect(preview('PTT: kargo\nlink')).toBe('PTT: kargo');
    expect(preview('x'.repeat(100), 10)).toBe(`${'x'.repeat(9)}…`);
  });
});

describe('loadHistory', () => {
  it('removes history saved in the old format', async () => {
    await AsyncStorage.setItem('isitfishy.history.v1', '[{"input":"old message"}]');
    await expect(loadHistory()).resolves.toEqual([]);
    await expect(AsyncStorage.getItem('isitfishy.history.v1')).resolves.toBeNull();
  });
});

describe('page image', () => {
  it('is not kept in history', () => {
    const withImage = { ...entry('a', '1'), result: { ...result, preview: 'aGVsbG8=' } };
    expect(addToHistory([], withImage)[0].result.preview).toBeNull();
  });
});
