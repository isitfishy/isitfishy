import {
  defang,
  evidence,
  familyMessage,
  openable,
  reasons,
  reassurances,
  sharedText,
  shown,
} from '../format';
import type { CheckResult, Reason } from '@isitfishy/api-client';

const reason = (group: Reason['group'], en: string, tr: string): Reason => ({
  group,
  message: { en, tr },
});

const base: CheckResult = {
  verdict: 'high',
  unverified: false,
  link: null,
  destination: null,
  reasons: [],
};

describe('reason groups', () => {
  const result: CheckResult = {
    ...base,
    reasons: [
      reason('evidence', 'Strong reason', 'Güçlü neden'),
      reason('warning', 'Reason a', 'Neden a'),
      reason('warning', 'Reason b', 'Neden b'),
      reason('reassurance', 'In favour', 'Lehine'),
    ],
  };

  it('keeps each group apart, in the order the server sent', () => {
    expect(evidence(result, 'tr')).toEqual(['Güçlü neden']);
    expect(reasons(result, 'tr')).toEqual(['Neden a', 'Neden b']);
    expect(reassurances(result, 'tr')).toEqual(['Lehine']);
  });

  it('falls back to English, then Turkish, when a translation is missing', () => {
    expect(reasons(result, 'de')).toEqual(['Reason a', 'Reason b']);
    const onlyTr: CheckResult = {
      ...base,
      reasons: [{ group: 'warning', message: { tr: 'Sadece Türkçe' } }],
    };
    expect(reasons(onlyTr, 'fr')).toEqual(['Sadece Türkçe']);
  });
});

describe('sharedText', () => {
  it('uses the shared message and adds a link shared alongside it', () => {
    expect(sharedText({ text: 'Kargonuz bekliyor', webUrl: 'https://ptt-x.xyz' })).toBe(
      'Kargonuz bekliyor\nhttps://ptt-x.xyz',
    );
    expect(sharedText({ text: 'Bak: https://ptt-x.xyz', webUrl: 'https://ptt-x.xyz' })).toBe(
      'Bak: https://ptt-x.xyz',
    );
    expect(sharedText({ text: null, webUrl: 'https://bit.ly/x' })).toBe('https://bit.ly/x');
    expect(sharedText({})).toBe('');
  });
});

describe('defang', () => {
  it('makes a link impossible to tap and drops the query and fragment', () => {
    expect(defang('https://ptt-kargo.xyz')).toBe('hxxps://ptt-kargo[.]xyz');
    expect(defang('http://a.b.example/pay?id=42#top')).toBe('hxxp://a[.]b[.]example/pay');
    expect(defang(' HTTPS://Bank.example/ ')).toBe('hxxpS://Bank[.]example/');
    expect(defang('ptt-kargo-teslimat.xyz/tr')).toBe('ptt-kargo-teslimat[.]xyz/tr');
  });
});

describe('familyMessage', () => {
  const result: CheckResult = {
    ...base,
    link: 'https://bad-site.example/track?u=123',
    reasons: [
      reason('evidence', 'Strong reason', 'Güçlü neden'),
      reason('warning', 'Reason a', 'Neden a'),
      reason('warning', 'Reason b', 'Neden b'),
      reason('warning', 'Reason c', 'Neden c'),
      reason('reassurance', 'In favour', 'Lehine'),
    ],
  };

  it('gives the band, the top three reasons and the defanged link', () => {
    expect(familyMessage(result, 'en')).toBe(
      [
        'High risk: Do not open this link or enter any details.',
        'Why:\n- Strong reason\n- Reason a\n- Reason b',
        'The link (do not open it):\nhxxps://bad-site[.]example/track',
        'Checked with IsItFishy',
      ].join('\n\n'),
    );
  });

  it('is written in the chosen language and never contains a tappable link', () => {
    const text = familyMessage(result, 'tr');
    expect(text).toContain('Yüksek risk:');
    expect(text).toContain('- Neden a');
    expect(text).toContain('IsItFishy ile kontrol edildi');
    expect(text).not.toMatch(/https?:\/\//);
    expect(text).not.toContain('u=123');
  });

  it('defangs addresses named inside the reasons too', () => {
    const named: CheckResult = {
      ...result,
      reasons: [reason('warning', 'Mentions bad-site.example.', 'bad-site.example geçiyor.')],
    };
    expect(familyMessage(named, 'en')).toContain('- Mentions bad-site[.]example.');
  });

  it('leaves out reasons and the link when there are none', () => {
    const plain: CheckResult = { ...base, verdict: 'low' };
    expect(familyMessage(plain, 'en')).toBe(
      'Low risk: We found no strong warning signs.\n\nChecked with IsItFishy',
    );
  });
});

describe('openable', () => {
  it('keeps http and https links as they are', () => {
    expect(openable(' https://ptt.gov.tr/kargo?id=1 ')).toBe('https://ptt.gov.tr/kargo?id=1');
    expect(openable('http://example.com')).toBe('http://example.com');
  });

  it('adds https to a bare host, also one with a port', () => {
    expect(openable('ptt-kargo.xyz/takip')).toBe('https://ptt-kargo.xyz/takip');
    expect(openable('example.com:8080/x')).toBe('https://example.com:8080/x');
  });

  it('refuses other schemes and broken input', () => {
    expect(openable('javascript:alert(1)')).toBeNull();
    expect(openable('intent://scan#Intent;end')).toBeNull();
    expect(openable('tel:+905551112233')).toBeNull();
    expect(openable('https://')).toBeNull();
    expect(openable('https://a.com/ b')).toBeNull();
    expect(openable('')).toBeNull();
  });
});

describe('shown', () => {
  it('turns an unverified low result into its own state', () => {
    expect(shown({ ...base, verdict: 'low', unverified: true })).toBe('unverified');
    expect(shown({ ...base, verdict: 'low' })).toBe('low');
  });

  it('keeps medium and high as they are', () => {
    expect(shown({ ...base, verdict: 'high', unverified: true })).toBe('high');
  });
});
