import type { CheckResult } from '@isitfishy/api-client';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ResultCard } from '../components/ResultCard';
import { t } from '../i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const s = t('en');

function result(verdict: CheckResult['verdict'], unverified = false): CheckResult {
  return {
    verdict,
    unverified,
    link: 'https://ptt-kargo-teslimat.xyz/tr',
    destination: null,
    preview: null,
    reasons: [],
  } as unknown as CheckResult;
}

describe('stop panel', () => {
  it('asks for a decision on a high-risk result and hides "open anyway" once made', async () => {
    await render(<ResultCard result={result('high')} lang="en" />);
    expect(screen.getByText(s.stopTitle.high)).toBeTruthy();
    expect(screen.getByTestId('open')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('stop-cancel'));
    expect(screen.getByText(s.stopCancelled)).toBeTruthy();
    expect(screen.queryByTestId('stop-cancel')).toBeNull();
    expect(screen.queryByTestId('open')).toBeNull();
  });

  it('thanks the person for waiting on a suspicious result', async () => {
    await render(<ResultCard result={result('medium')} lang="en" />);
    expect(screen.getByText(s.stopTitle.medium)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('stop-later'));
    expect(screen.getByText(s.stopLaterDone)).toBeTruthy();
  });

  it('is not shown for low or unverified results', async () => {
    await render(<ResultCard result={result('low', true)} lang="en" />);
    expect(screen.queryByTestId('stop')).toBeNull();
    await render(<ResultCard result={result('low')} lang="en" />);
    expect(screen.queryByTestId('stop')).toBeNull();
  });

  it('tells a low result to go through the official channel', async () => {
    await render(<ResultCard result={result('low')} lang="en" />);
    expect(screen.getByTestId('low-verify')).toBeTruthy();
  });
});
