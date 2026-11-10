import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CheckResult } from '@isitfishy/api-client';

/** A past check, kept only on this phone so it can be reopened without asking the server. */
export interface HistoryEntry {
  input: string;
  checkedAt: string;
  result: CheckResult;
}

const KEY = 'isitfishy.history.v2';
// Entries of the old result format: unreadable now, and they hold the checked text.
const OLD_KEY = 'isitfishy.history.v1';
export const HISTORY_LIMIT = 20;

/** The newest check first, without an older copy of the same input, capped at `limit`. */
export function addToHistory(
  list: HistoryEntry[],
  entry: HistoryEntry,
  limit = HISTORY_LIMIT,
): HistoryEntry[] {
  // The page image is shown once and never kept.
  const kept = { ...entry, result: { ...entry.result, preview: null } };
  return [kept, ...list.filter((e) => e.input !== entry.input)].slice(0, limit);
}

/** First line of the input, short enough for one row. */
export function preview(input: string, max = 70): string {
  const line = input.trim().split('\n')[0] ?? '';
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    await AsyncStorage.removeItem(OLD_KEY);
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function saveHistory(list: HistoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // History is a convenience; a failed write must not break a check.
  }
}
