/**
 * Kullanıcının 3DS'ten döndüğü anı yakalar. Kart formu verify'ın erken fazını
 * bu anda başlatır (`verifyPacer` → `markReturned`): 3DS sürerken kullanıcı
 * bankada, ödeme henüz onaylanmadı; o sırada gönderilen verify bütçeyi boşa
 * harcar.
 *
 * Dönüş sinyalleri (3DS WebView açıkken):
 *  - Uygulama arka plandan öne geldi: kullanıcı banka uygulamasında onaylayıp
 *    döndü.
 *  - WebView banka sayfasından (PayTR dışı bir http(s) adresi) yeniden PayTR'ye
 *    döndü: PayTR sonucu işliyor ("ödeme alınıyor" sayfası). Akış: form →
 *    paytr.com → banka ACS → paytr.com → merchant ok/fail URL.
 * Merchant başarı/başarısız URL'leri kart formunda zaten sonucu bildiriyor.
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** PayTR alan adı mı (`paytr.com` ve alt alan adları). RN `URL` hostname desteklemediği için regex. */
export function isPaytrUrl(url: string): boolean {
  return /^https?:\/\/([a-z0-9-]+\.)*paytr\.com(:\d+)?([/?#]|$)/i.test(url);
}

const isWebUrl = (url: string) => /^https?:\/\//i.test(url);

/**
 * `active`: 3DS WebView açık. `onReturn` dönüşte çağrılır (birden çok kez
 * çağrılabilir; çağıranın işlemi idempotent olmalı). WebView'in her
 * gezinmesinde dönen `onNavigate(url)` çağrılmalı.
 */
export function useThreeDSReturn(active: boolean, onReturn: () => void): { onNavigate: (url: string) => void } {
  const onReturnRef = useRef(onReturn);
  useEffect(() => {
    onReturnRef.current = onReturn;
  });
  // Bu 3DS oturumunda banka (PayTR dışı) sayfası görüldü mü.
  const sawBankPage = useRef(false);

  useEffect(() => {
    if (!active) return;
    sawBankPage.current = false;
    let wentBackground = false;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') wentBackground = true;
      else if (state === 'active' && wentBackground) {
        wentBackground = false;
        onReturnRef.current();
      }
    });
    return () => subscription.remove();
  }, [active]);

  const onNavigate = useCallback(
    (url: string) => {
      if (!active) return;
      if (isPaytrUrl(url)) {
        if (sawBankPage.current) onReturnRef.current();
      } else if (isWebUrl(url)) {
        sawBankPage.current = true;
      }
    },
    [active],
  );

  return { onNavigate };
}
