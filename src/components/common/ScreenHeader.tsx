/**
 * `ScreenHeader`'ın uygulama tarafı sarmalayıcısı — geri okuna varsayılan davranış verir.
 *
 * `@/ui`'deki taban bileşen geri okunu HER ZAMAN çizer (`showBack` varsayılanı
 * `true`) ama `disabled={!onBack}` der. `onBack` geçmeyen bir ekranda ok
 * görünür ve HİÇBİR ŞEY yapmaz — kullanıcı ekranda kilitli kalır. 16 ekran
 * bu durumdaydı (dil ayarları, markalar, modeller, üreticiler, bülten,
 * teklif/satış detayı, ödeme yöntemleri…); ilk commit'ten beri böyleydi.
 *
 * Taban bileşen `@/ui` içinde ve expo-router'a bağlı DEĞİL (vendored paket
 * sınırı) — bu yüzden router'ı bilen varsayılan burada, uygulama katmanında
 * duruyor. Kendi `onBack`'ini geçen ekranlar aynen çalışmaya devam eder.
 *
 * Geri gidilecek bir yer yoksa (derin bağlantıyla doğrudan açılmış ekran)
 * `onBack` verilmez ve ok yine devre dışı kalır — yani bu düzeltme hiçbir
 * durumda çalışmayan bir okla değiştirmez, yalnız çalışabildiğinde çalıştırır.
 */
import React from 'react';
import { router } from 'expo-router';
import {
  ScreenHeader as BaseScreenHeader,
  type ScreenHeaderProps,
} from '@/ui';

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  onBack,
  ...props
}) => {
  const fallback = React.useCallback(() => {
    if (router.canGoBack()) router.back();
  }, []);

  return (
    <BaseScreenHeader
      {...props}
      onBack={onBack ?? (router.canGoBack() ? fallback : undefined)}
    />
  );
};

export default ScreenHeader;
