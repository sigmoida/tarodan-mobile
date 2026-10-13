import { useCallback, useEffect, useRef } from 'react';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

/**
 * Form EKRANININ çıkış kuralı (modaldan ekrana taşınan formlar: iade, puanlama,
 * itiraz). Üç iş:
 *
 * 1. `dirty` iken her geri çıkış (üst bar oku, iOS kaydırma, Android geri tuşu)
 *    önce onay ister — `useUnsavedChangesGuard`.
 * 2. `leave()` başarılı gönderimden sonra korumayı kaldırıp bir adım geri çıkar
 *    (geçmiş yoksa ana sekme). Ekran o sırada artık açık DEĞİLSE (istek sürerken
 *    kullanıcı vazgeçip çıktıysa) hiçbir şey yapmaz — yoksa geç gelen başarı bir
 *    önceki ekranı (ör. sipariş detayı) da kapatırdı.
 * 3. `isOpen()` çok adımlı gönderimde (yükle → gönder) ara adımdan sonra ekranın
 *    hâlâ açık olup olmadığını söyler: kullanıcı vazgeçip çıktıysa ikinci adım atılmaz.
 */
export function useFormScreenExit(dirty: boolean) {
  const { allowLeave } = useUnsavedChangesGuard(dirty);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const leave = useCallback(() => {
    if (!mounted.current) return;
    allowLeave();
    goBackOrHome();
  }, [allowLeave]);
  const isOpen = useCallback(() => mounted.current, []);

  return { leave, isOpen };
}
