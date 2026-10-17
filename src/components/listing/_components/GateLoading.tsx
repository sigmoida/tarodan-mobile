import React from 'react';
import { ScreenLoader } from '@/ui';

/**
 * Ön koşul kapısı (IBAN / kargo adresi) okunurken gösterilen TEK yükleniyor göstergesi.
 * Form gövdesi içinde (kota kartının altında) çizildiği için tam ekran değil: standart
 * `ScreenLoader`, `fullscreen={false}`.
 */
export function GateLoading() {
  return <ScreenLoader fullscreen={false} />;
}
