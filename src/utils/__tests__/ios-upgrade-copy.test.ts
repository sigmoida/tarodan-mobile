/**
 * Kapalı özellik kapıları iOS'ta ücretli kademeden söz etmemeli: mesaj
 * yalnız hesabın durumunu bildirir. Giriş noktaları KALDIRILMAZ — kullanıcı
 * özelliğin var olduğunu görür, kapıda ne olduğunu öğrenir.
 *
 * TEKNİK: CAN_BUY_DIGITAL modül-yükleme-anındaki bir sabit; `jest.isolateModules`
 * + gövde içinde `Platform.OS` ataması burada İŞE YARAMIYOR — isolateModules
 * `react-native`ı da taze yüklüyor ve Platform.OS jest-expo varsayılanına
 * (`ios`) dönüyor, önceki atama kayboluyor. Bunun yerine `@/lib/purchases`ı
 * modül seviyesinde mock'luyoruz (babel-plugin-jest-hoist import'ların üstüne
 * taşır). Android eşi: android-upgrade-copy.test.ts.
 */
jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
}));

import { getUpgradeMessage } from '../membershipLimits';

const t = ((k: string) => k) as any;

describe('iOS · kapalı özellik kapı metinleri nötr', () => {
  it('tradeFeature: başlık korunur, mesaj nötr', () => {
    const msg = getUpgradeMessage(t, 'tradeFeature');
    expect(msg.title).toBe('trade.featureTitle');
    expect(msg.message).toBe('membership.featureUnavailableOnAccount');
  });

  it('collectionFeature: başlık korunur, mesaj nötr', () => {
    const msg = getUpgradeMessage(t, 'collectionFeature');
    expect(msg.title).toBe('membership.featureDigitalGarage');
    expect(msg.message).toBe('membership.featureUnavailableOnAccount');
  });

  it('listingLimit (default dal): başlık korunur, mesaj nötr', () => {
    const msg = getUpgradeMessage(t, 'listingLimit');
    expect(msg.title).toBe('upgradePrompt.listingLimitTitle');
    expect(msg.message).toBe('membership.featureUnavailableOnAccount');
  });
});
