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
 * Çıkış izni (kayıt başarılı / "Değişiklikleri Sil"): `leave(go)` korumayı kapatır,
 * `go()` (router.back / bekleyen eylem) koruma kalktıktan SONRA çalışır. Koruma,
 * ekran kapanana ya da `dirty` yeniden DEĞİŞENE (ör. form sıfırlanıp tekrar
 * kirlenene) kadar KAPALI kalır. Tek render'lık açma yetmez: expo-router 6
 * `router.back()` GO_BACK'i kuyruğa alıp SONRAKİ render'da gönderir — o ana dek
 * koruma yeniden kurulmuş olur ve başarılı kayıttan sonra "Kaydedilmemiş
 * değişiklikler" diyaloğu çıkar. Ekran o sırada artık açık değilse (istek
 * sürerken kullanıcı vazgeçip çıktı) `leave` hiçbir şey yapmaz: geç gelen başarı
 * bir önceki ekranı da kapatmaz.
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
  // `leave` sonrası koruma kapalı; yalnız `dirty` değişince yeniden kurulur.
  const [released, setReleased] = useState(false);
  // Açık onay diyaloğunun kararı (true = vazgeç) ve "ekrandan çıkılıyor" bayrağı.
  const decision = useRef<Promise<boolean> | null>(null);
  const leaving = useRef(false);
  useEffect(() => {
    leaving.current = false;
    return () => {
      leaving.current = true;
    };
  }, []);

  const leave = useCallback((go: () => void) => {
    setReleased(true);
    setPendingLeave(() => go);
  }, []);

  // Koruma kalktığı render'dan sonra: kancanın kaydı (insertion effect) ve
  // dinleyicisi güncellenmiş olur; çıkış (ertelenmiş GO_BACK dahil) engellenmeden geçer.
  useEffect(() => {
    if (!pendingLeave) return;
    setPendingLeave(null);
    pendingLeave();
  }, [pendingLeave]);

  // Form yeniden kirlenir/temizlenirse (ekran bir nedenle kaldıysa) koruma yeniden devrede.
  const lastDirty = useRef(dirty);
  useEffect(() => {
    if (lastDirty.current === dirty) return;
    lastDirty.current = dirty;
    setReleased(false);
  }, [dirty]);

  usePreventRemove(dirty && !released, ({ data }) => {
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
