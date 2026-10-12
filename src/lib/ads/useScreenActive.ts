import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Ekran şu an kullanıcının önünde mi? Ekran odakta (başka sekme/ekran üstte
 * değil) VE uygulama arka planda değilse `true`. Gösterim sayacı ve otomatik
 * ilerleme gibi "yalnız görünürken çalışsın" işleri için TEK kaynak.
 */
export function useScreenActive(): boolean {
  const [focused, setFocused] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  return focused && appActive;
}
