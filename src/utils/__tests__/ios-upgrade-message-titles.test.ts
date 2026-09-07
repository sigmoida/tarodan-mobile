/**
 * Bulgu C · iOS'ta getUpgradeMessage'ın `switch` dalı yalnızca 'tradeFeature'
 * ve 'collectionFeature' tiplerini ayrı ele alıyor, geri kalan HER ŞEYİ
 * (addressLimit, savedSearchLimit, imageLimit, messageLimit, featureListing,
 * valueLimit) 'default'a düşürüp ilan-limiti başlığını döndürüyordu. Örneğin
 * adres limiti dolduğunda kullanıcı "İlan Limitine Ulaştınız" görüyordu.
 * Her promptType artık kendi (non-iOS ile aynı) başlığını korur; mesaj nötr
 * kalır — bkz. CLAUDE.md COPY RULE.
 *
 * TEKNİK: CAN_BUY_DIGITAL modül seviyesinde mock'lanmalı.
 */
jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
}));

import { getUpgradeMessage, type UpgradePromptType } from '../membershipLimits';

const t = ((key: string) => key) as any;

describe('iOS · getUpgradeMessage her promptType için kendi başlığını korur', () => {
  const neutral = 'membership.featureUnavailableOnAccount';

  const cases: Array<[UpgradePromptType, string]> = [
    ['listingLimit', 'upgradePrompt.listingLimitTitle'],
    ['tradeFeature', 'trade.featureTitle'],
    ['collectionFeature', 'membership.featureDigitalGarage'],
    ['featureListing', 'upgradePrompt.featureListingTitle'],
    ['messageLimit', 'upgradePrompt.messageLimitTitle'],
    ['addressLimit', 'address.limitTitle'],
    ['savedSearchLimit', 'membership.savedSearchLimitTitle'],
    ['imageLimit', 'upgradePrompt.imageLimitTitle'],
    ['valueLimit', 'membership.valueLimitTitle'],
  ];

  it.each(cases)('%s → başlık %s, mesaj nötr', (promptType, expectedTitle) => {
    const result = getUpgradeMessage(t, promptType);
    expect(result.title).toBe(expectedTitle);
    expect(result.message).toBe(neutral);
  });

  it('adres limiti başlığı ilan limiti başlığıyla ASLA karışmaz (regresyon)', () => {
    const address = getUpgradeMessage(t, 'addressLimit');
    expect(address.title).not.toBe('upgradePrompt.listingLimitTitle');
    expect(address.title).toBe('address.limitTitle');
    expect(address.message).toBe(neutral);
  });
});
