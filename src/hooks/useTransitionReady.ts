import { useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';

/**
 * Geçiş animasyonu bitmeden `transitionEnd` gelmezse (animasyonsuz açılış, derin bağlantı, test
 * ortamı) bu süre sonunda yine hazır sayılır (pt değil ms; native stack itişi ≈ 350ms).
 */
export const TRANSITION_READY_FALLBACK_MS = 450;

/**
 * Yığın ekranının açılış animasyonu bitti mi? Native stack yeni ekranın İLK karesi hazır olmadan
 * kaydırmaya başlamaz ve animasyon sürerken JS turunu meşgul eden iş (klavye açmak, onlarca kartı
 * çizmek) geçişi takılır gösterir. Ağır işi bu sinyale bağlayın: ilk kare hafif kalır, iş geçişten
 * hemen sonra başlar. Kaynak react-navigation `transitionEnd` olayı (kapanış değil, açılış);
 * gelmezse `TRANSITION_READY_FALLBACK_MS` sonra emniyet zamanlayıcısı.
 */
export function useTransitionReady(): boolean {
  const navigation = useNavigation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return undefined;
    const timer = setTimeout(() => setReady(true), TRANSITION_READY_FALLBACK_MS);
    const unsubscribe = (navigation as { addListener?: (...a: unknown[]) => () => void }).addListener?.(
      'transitionEnd',
      (e: { data?: { closing?: boolean } }) => {
        if (!e?.data?.closing) setReady(true);
      },
    );
    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [navigation, ready]);

  return ready;
}
