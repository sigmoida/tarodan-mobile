import { router } from 'expo-router';

/**
 * Geri davranışının TEK kuralı: geçmiş varsa bir adım geri; yoksa (derin bağlantı / bildirimle
 * doğrudan açılmış ekran) ana sekmeye `replace`. Üst barın geri oku bu yüzden hiçbir ekranda
 * ölü/devre dışı kalmaz.
 */
export function goBackOrHome(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
