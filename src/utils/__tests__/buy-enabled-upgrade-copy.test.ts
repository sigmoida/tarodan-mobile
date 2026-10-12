/**
 * [D-2.7] DİKKAT: Android artık iOS gibi kapalı (CAN_BUY_DIGITAL=false iki
 * platformda; bkz. src/lib/__tests__/digitalGate.platforms.test.tsx). Bu test
 * 'satın alma AÇIK' dalını (CAN_BUY_DIGITAL mock: true) korur — IAP / Play
 * Billing eklenip kapı açılırsa geçerli olacak davranış. Metindeki 'Android'
 * ifadeleri tarihsel: 'satın alma açık platform' olarak okunmalı.
 * Android eşi (bkz. ios-upgrade-copy.test.ts): kapalı özellik kapı mesajları
 * Android/web'de DEĞİŞMEDEN eski yükseltme metinleri olmaya devam eder.
 */
jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
}));

import { getUpgradeMessage } from '../membershipLimits';

const t = ((k: string) => k) as any;

describe('Android · kapalı özellik kapı metinleri korunur', () => {
  it('tradeFeature: mevcut yükseltme metni korunur', () => {
    const msg = getUpgradeMessage(t, 'tradeFeature');
    expect(msg.title).toBe('trade.featureTitle');
    expect(msg.message).toBe('upgradePrompt.tradeFeatureMessage');
  });

  it('collectionFeature: mevcut yükseltme metni korunur', () => {
    const msg = getUpgradeMessage(t, 'collectionFeature');
    expect(msg.message).toBe('upgradePrompt.collectionFeatureMessage');
  });
});
