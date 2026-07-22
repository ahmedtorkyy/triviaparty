import en from './en';
import ar from './ar';

type TranslationValue = string | ((...args: any[]) => string);

class I18nManager {
  private locale: 'en' | 'ar' = 'en';
  private translations: Record<string, TranslationValue> = { ...en };

  setLocale(locale: 'en' | 'ar') {
    this.locale = locale;
    this.translations = locale === 'ar' ? { ...ar } : { ...en };
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }

  getLocale(): 'en' | 'ar' {
    return this.locale;
  }

  t(key: string, ...args: any[]): string {
    const value = this.translations[key];
    if (value === undefined) {
      console.warn(`Missing translation key: ${key}`);
      return key;
    }
    if (typeof value === 'function') {
      return (value as Function)(...args);
    }
    return value as string;
  }
}

export const i18n = new I18nManager();
export const t = i18n.t.bind(i18n);
