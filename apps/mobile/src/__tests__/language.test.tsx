import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { t } from '../i18n';
import { LanguageProvider, resolveLang, useLang, useSetLang } from '../language';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-localization', () => ({ useLocales: () => [{ languageCode: 'tr' }] }));

const KEY = 'isitfishy.language.v1';

function Probe() {
  const lang = useLang();
  const setLang = useSetLang();
  return (
    <>
      <Text testID="title">{t(lang).title}</Text>
      <Pressable testID="german" onPress={() => setLang('de')} />
    </>
  );
}

async function renderProbe() {
  await render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
  // Let the saved choice load.
  await act(async () => undefined);
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('resolveLang', () => {
  it('follows the phone until a language is chosen', () => {
    expect(resolveLang(null, 'de-DE')).toBe('de');
    expect(resolveLang(null, 'zh')).toBe('en');
    expect(resolveLang(null, undefined)).toBe('en');
    expect(resolveLang('it', 'tr')).toBe('it');
  });
});

describe('LanguageProvider', () => {
  it('follows the phone until a language is chosen, then switches and remembers it', async () => {
    await renderProbe();
    expect(screen.getByTestId('title')).toHaveTextContent(t('tr').title);

    await fireEvent.press(screen.getByTestId('german'));
    expect(screen.getByTestId('title')).toHaveTextContent(t('de').title);
    expect(await AsyncStorage.getItem(KEY)).toBe('de');
  });

  it('restores the saved language and ignores one it does not know', async () => {
    await AsyncStorage.setItem(KEY, 'fr');
    await renderProbe();
    expect(screen.getByTestId('title')).toHaveTextContent(t('fr').title);
    await screen.unmount();

    // "system" was saved by the version that still offered it: follow the phone.
    for (const saved of ['zh', 'system']) {
      await AsyncStorage.setItem(KEY, saved);
      await renderProbe();
      expect(screen.getByTestId('title')).toHaveTextContent(t('tr').title);
      await screen.unmount();
    }
  });
});
