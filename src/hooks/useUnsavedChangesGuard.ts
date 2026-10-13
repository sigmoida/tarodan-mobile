import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';
// expo-router `usePreventRemove`'u yeniden dışa vermiyor; aynı (tekil) react-navigation
// kopyasından alınır — bkz. `src/ui/lib/screenFocus.ts`. expo-router `useNavigation()`
// (parent'sız) doğrudan react-navigation'ınkini döndürür: bu ekranın navigator'ı,
// `usePreventRemove`'un içeride kullandığıyla AYNI nesne.
import { usePreventRemove } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/ui';

/**
 * Çok alanlı form EKRANLARI için taslak kaybı koruması (web `useFormModalLabels`
 * ile aynı metinler: `common.unsavedChanges` …). Form kirliyken ekrandan her
 * çıkış — üst bardaki geri oku, iOS kaydırarak geri, Android donanım geri tuşu —
 * önce onay ister.
 *
 * `usePreventRemove` ŞART (ham `beforeRemove` dinleyicisi değil): native-stack
 * iOS kaydırma hareketini yalnız bu kancanın `preventedRoutes` kaydıyla
 * (`preventNativeDismiss`) engelliyor. Ham dinleyicide native ekran önce çıkar,
 * sonra JS pop'u engellenir → JS/native yığın ayrışır (boş/takılı ekran).
 *
 * Çıkış izni (kayıt başarılı / "Değişiklikleri Sil"): `leave(go)` korumayı TEK
 * render için kapatır, `go()` (router.back / bekleyen eylem) koruma kalktıktan
 * SONRA çalışır, ardından koruma yeniden kurulur — ekran bir nedenle kalırsa
 * sonraki düzenlemeler korumasız kalmaz.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  const leave = useCallback((go: () => void) => setPendingLeave(() => go), []);

  // Koruma kalktığı render'dan sonra: kancanın kaydı (insertion effect) ve
  // dinleyicisi güncellenmiş olur; çıkış engellenmeden geçer, sonra koruma geri gelir.
  useEffect(() => {
    if (!pendingLeave) return;
    pendingLeave();
    setPendingLeave(null);
  }, [pendingLeave]);

  usePreventRemove(dirty && !pendingLeave, ({ data }) => {
    // `confirm()` kapanış SONRASI çözülür (AlertDialog sözleşmesi) → dispatch iOS-güvenli.
    void confirm({
      title: t('common.unsavedChanges'),
      message: t('common.unsavedChangesDescription'),
      confirmLabel: t('common.discardChanges'),
      cancelLabel: t('common.continueEditing'),
      destructive: true,
    }).then((discard) => {
      if (discard) leave(() => navigation.dispatch(data.action));
    });
  });

  return { leave };
}
