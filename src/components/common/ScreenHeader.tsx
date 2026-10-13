/**
 * `ScreenHeader`'ın uygulama tarafı sarmalayıcısı — geri oku TEK kuralla çalışır (`goBackOrHome`).
 *
 * `@/ui`'deki taban bileşen geri okunu HER ZAMAN çizer (`showBack` varsayılanı `true`) ama
 * `disabled={!onBack}` der. `onBack` geçmeyen bir ekranda ok görünür ve HİÇBİR ŞEY yapmaz —
 * kullanıcı ekranda kilitli kalırdı (16 ekran bu durumdaydı).
 *
 * Taban bileşen `@/ui` içinde ve expo-router'a bağlı DEĞİL (vendored paket sınırı) — bu yüzden
 * router'ı bilen varsayılan burada, uygulama katmanında duruyor. Kendi `onBack`'ini geçen
 * ekranlar aynen çalışmaya devam eder. Geçmiş yoksa ok `/(tabs)`'a `replace` eder; yani ok hiçbir
 * durumda devre dışı kalmaz.
 */
import React from 'react';
import {
  ScreenHeader as BaseScreenHeader,
  type ScreenHeaderProps,
} from '@/ui';
import { goBackOrHome } from './goBackOrHome';

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ onBack, ...props }) => (
  <BaseScreenHeader {...props} onBack={onBack ?? goBackOrHome} />
);

export default ScreenHeader;
