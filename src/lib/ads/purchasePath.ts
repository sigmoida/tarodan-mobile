import { stripLocalePrefix } from '@/lib/deeplinks';

/**
 * Dijital satış (üyelik, boost/öne çıkarma) kapalı — bu yollar uygulamada hiçbir
 * yerden (reklam linki, uygulama içi web ekranı) açılmamalı (Apple 3.1.1/3.1.3;
 * Play ödeme politikası). Web ve mobil yol adları birlikte listelenir.
 * TEK kaynak: hem `resolveAdLink` hem `app/in-app-web` bunu kullanır.
 */
const PURCHASE_PATH =
  /^\/(membership|pricing|upgrade|boost|premium|subscription|profile\/(membership|boost|subscription)|settings\/subscription)(\/|$)/i;

/**
 * Yol (sorgu/hash olabilir) satın almaya götürüyor mu? Locale önekli
 * (`/en/membership`) ve sondaki `/` ile yazılmış biçimleri de kapsar.
 */
export function isPurchasePath(pathWithQuery: string): boolean {
  const raw = pathWithQuery.split(/[?#]/)[0]!.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  return PURCHASE_PATH.test(stripLocalePrefix(raw));
}
