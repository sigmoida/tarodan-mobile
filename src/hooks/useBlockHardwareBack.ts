import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

/**
 * Android donanım geri tuşunu ekran odaktayken YAKALAR (iOS'ta etkisiz; BackHandler yalnız Android/TV).
 * Tuş her zaman tüketilir — yığında geriye gitmez, uygulamadan da çıkmaz. `onBack` verilirse çağrılır:
 *
 * - Sonuç ekranları (ödeme/üyelik/sipariş başarı-hata): `useBlockHardwareBack(() => router.replace('/(tabs)'))`
 *   → geri = ana sayfa (iOS'ta bu ekranlarda geri oku/kaydırma da kapalı; web'de de "ana sayfa" düğmesi vardır).
 * - Kapı ekranları (banlı, kurumsal beklemede/reddedildi): `useBlockHardwareBack()` → geri yutulur;
 *   çıkış yolu ekrandaki düğmelerdir (iOS `gestureEnabled: false` ile aynı davranış).
 *
 * Başka bir geri yakalayıcı (ör. açık modal/AlertDialog) daha SONRA kaydolmuşsa önce o çalışır (RN
 * BackHandler son kaydolan önce); bu kanca yalnız ekranın kendi varsayılanını belirler.
 */
export function useBlockHardwareBack(onBack?: () => void): void {
  const handlerRef = useRef(onBack);
  useEffect(() => {
    handlerRef.current = onBack;
  }, [onBack]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handlerRef.current?.();
        return true;
      });
      return () => sub.remove();
    }, []),
  );
}

const replaceToHome = () => router.replace('/(tabs)');

/**
 * Sonuç ekranları için kısayol: donanım geri = ana sayfa (`router.replace('/(tabs)')`). Önceki ekran
 * (checkout/ödeme formu) yığında kalmış olsa bile oraya dönülmez.
 */
export function useHardwareBackToHome(): void {
  useBlockHardwareBack(replaceToHome);
}

export default useBlockHardwareBack;
