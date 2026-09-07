import React from 'react';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

/**
 * Yükseltmeye çağıran her yüzeyi tek noktadan gizler.
 *
 * SARMALAYICI olması bilinçli: çağrı yerleri kendi stillerini ve metinlerini
 * korur, Android'de render birebir aynı kalır. Yeniden yazsaydık 12 ayrı
 * stil dosyasını taşımamız gerekirdi — regresyon yüzeyi büyürdü.
 */
export default function UpgradeCta({ children }: { children: React.ReactNode }) {
  if (!CAN_BUY_DIGITAL) return null;
  return <>{children}</>;
}
