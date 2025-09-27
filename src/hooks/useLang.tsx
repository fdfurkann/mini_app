import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const getLocale = (lang: string) => {
  switch (lang) {
    case 'en':
      return import('@/utils/en');
    case 'de':
      return import('@/utils/de');
    case 'fr':
      return import('@/utils/fr');
    case 'es':
      return import('@/utils/es');
    case 'ru':
      return import('@/utils/ru');
    case 'it':
      return import('@/utils/it');
    case 'ar':
      return import('@/utils/ar');
    case 'ja':
      return import('@/utils/ja');
    case 'tr':
    default:
      return import('@/utils/tr');
  }
};

interface LangContextType {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
  isReady: boolean;
}

const LangContext = createContext<LangContextType>({
  lang: 'tr',
  setLang: () => {},
  t: (key: string) => key,
  isReady: false,
});

export const LangProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState(localStorage.getItem('lang') || 'tr');
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    setIsReady(false);
    getLocale(lang).then((module) => {
      if (active) {
        setTranslations(module.default);
        setIsReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [lang]);

  const setLang = (newLang: string) => {
    localStorage.setItem('lang', newLang);
    setLangState(newLang);
  };

  const t = useCallback((key: string): string => {
    // Önce kök anahtar olarak dene
    if (translations && Object.prototype.hasOwnProperty.call(translations, key)) {
      return translations[key];
    }
    // Nested key support: 'a.b.c'
    return key.split('.').reduce((o, i) => (o ? o[i] : undefined), translations) || key;
  }, [translations]);
  
  return (
    <LangContext.Provider value={{ lang, setLang, t, isReady }}>
      {!isReady ? <div>Loading...</div> : children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext); 