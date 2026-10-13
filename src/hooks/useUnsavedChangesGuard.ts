import { useCallback, useEffect, useRef, useState } from 'react';
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
 * sonraki düzenlemeler korumasız kalmaz. Ekran o sırada artık açık değilse
 * (istek sürerken kullanıcı vazgeçip çıktı) `leave` hiçbir şey yapmaz: geç gelen
 * başarı bir önceki ekranı da kapatmaz.
 *
 * Çok adımlı gönderim (ör. iade: kanıt yükle → talep gönder): ara adımdan sonra
 * `await canProceed()` — "vazgeç?" onayı açıksa kararı bekler; "Değişiklikleri Sil"
 * seçildiyse ya da ekran kapandıysa `false` döner ve ikinci adım ATILMAZ.
 *
 * `copy`: varsayılan "kaydedilmemiş değişiklikler" metni yerine başka bir çıkış uyarısı
 * (ör. tek seferlik yedek kodlar ekrandayken).
 */
export interface LeaveGuardCopy {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function useUnsavedChangesGuard(dirty: boolean, copy?: LeaveGuardCopy) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  // Açık onay diyaloğunun kararı (true = vazgeç) ve "ekrandan çıkılıyor" bayrağı.
  const decision = useRef<Promise<boolean> | null>(null);
  const leaving = useRef(false);
  useEffect(() => {
    leaving.current = false;
    return () => {
      leaving.current = true;
    };
  }, []);

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
    const pending = confirm(
      copy ?? {
        title: t('common.unsavedChanges'),
        message: t('common.unsavedChangesDescription'),
        confirmLabel: t('common.discardChanges'),
        cancelLabel: t('common.continueEditing'),
        destructive: true,
      },
    ).then((discard) => {
      if (decision.current === pending) decision.current = null;
      if (discard) {
        leaving.current = true; // onay anından itibaren bekleyen gönderim adımları durur
        leave(() => navigation.dispatch(data.action));
      }
      return discard;
    });
    decision.current = pending;
  });

  const canProceed = useCallback(async () => {
    if (decision.current) await decision.current;
    return !leaving.current;
  }, []);

  return { leave, canProceed };
}
