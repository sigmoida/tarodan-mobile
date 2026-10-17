import React from 'react';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

/**
 * Yükseltmeye çağıran her yüzeyi tek noktadan gizler.
 *
 * SARMALAYICI olması bilinçli: çağrı yerleri kendi stillerini ve metinlerini
 * korur; satın alma açılırsa (`CAN_BUY_DIGITAL`) render birebir aynı kalır.
 * Yeniden yazsaydık 12 ayrı stil dosyasını taşımamız gerekirdi — regresyon
 * yüzeyi büyürdü. Şimdilik iOS ve Android'de de hiçbir şey çizmez.
 */
export default function UpgradeCta({ children }: { children: React.ReactNode }) {
  if (!CAN_BUY_DIGITAL) return null;
  return <>{children}</>;
}
