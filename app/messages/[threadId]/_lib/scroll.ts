import { theme } from '@/ui';

/**
 * "Dibe yakın" eşiği — mesaj listesinde kullanıcının en alttan bu kadar (pt)
 * uzaklıkta olması, yeni içerik geldiğinde otomatik kaydırmayı tetikler.
 * theme.spacing[16] (64pt) yaklaşık 3-4 satır mesaj yüksekliği — kullanıcı
 * gerçekten "dip"e yakınken kaçırmaz, birkaç mesaj yukarı okurken rahatsız etmez.
 */
export const NEAR_BOTTOM_THRESHOLD = theme.spacing[16];
