import { useCallback } from 'react';
import useStore from '../context/store';
import bn from './bn';

/** t('English text') gives the Bangla text when the visitor chose Bangla. A missing translation just shows English. */
export const translate = (lang, text) => (lang === 'bn' && typeof text === 'string' ? bn[text] || text : text);
export function useT() {
  const lang = useStore((s) => s.lang);
  return useCallback((text) => translate(lang, text), [lang]);
}
