import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocales } from 'expo-localization';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { type Lang, LANGS, pickLang } from './i18n';

const KEY = 'isitfishy.language.v1';

/** The language to show: the chosen one, or the phone's own until one is chosen. */
export function resolveLang(chosen: Lang | null, deviceLanguageCode: string | null | undefined): Lang {
  return chosen ?? pickLang(deviceLanguageCode);
}

const LanguageContext = createContext<{
  chosen: Lang | null;
  setLang: (lang: Lang) => void;
}>({
  chosen: null,
  setLang: () => undefined,
});

/** Remembers the chosen app language on this phone; until then the phone's language is used. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<Lang | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (LANGS.includes(saved as Lang)) {
          setChosen(saved as Lang);
        }
      })
      .catch(() => undefined);
  }, []);
  function setLang(lang: Lang) {
    setChosen(lang);
    AsyncStorage.setItem(KEY, lang).catch(() => undefined);
  }
  return (
    <LanguageContext.Provider value={{ chosen, setLang }}>{children}</LanguageContext.Provider>
  );
}

export function useSetLang() {
  return useContext(LanguageContext).setLang;
}

/** The language every screen renders in; changes as soon as another one is chosen. */
export function useLang(): Lang {
  const { chosen } = useContext(LanguageContext);
  const device = useLocales()[0]?.languageCode;
  return resolveLang(chosen, device);
}

/** The region the phone is set to, such as "TR" or "US", when it says. */
export function useRegion(): string | null {
  return useLocales()[0]?.regionCode ?? null;
}
