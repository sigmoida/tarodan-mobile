import { useContext, useEffect, useState } from 'react';
import { NavigationContext } from '@react-navigation/native';

/**
 * Bileşenin bulunduğu ekran şu an odakta mı (üstüne başka ekran itilmedi, başka sekmeye
 * geçilmedi). `useIsFocused`'tan farkı: navigasyon bağlamı yoksa (birim testler, kök
 * bileşenler) atmaz, `true` döner. Ekranın üstündeki yığına itme / sekme değişimi 'blur',
 * dönüş 'focus' olayıyla izlenir (üst navigatörün odak kaybı alt ekrana da yansır).
 */
export function useScreenFocused(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused?.() ?? true);
  useEffect(() => {
    if (!navigation?.addListener) return undefined;
    setFocused(navigation.isFocused());
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);
  return focused;
}
