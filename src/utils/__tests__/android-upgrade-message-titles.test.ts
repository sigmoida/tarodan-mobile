/**
 * Bulgu C eşi · Android/web davranışı DEĞİŞMEMELİ — getUpgradeMessage her
 * promptType için kendi başlığını VE kendi (satış içeren) mesajını döndürmeye
 * devam eder. iOS tarafı: ios-upgrade-message-titles.test.ts.
 */
jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
}));

import { getUpgradeMessage, type UpgradePromptType } from '../membershipLimits';

const t = ((key: string) => key) as any;

describe('Android · getUpgradeMessage her promptType için kendi başlığı ve mesajı', () => {
  const cases: Array<[UpgradePromptType, string, string]> = [
    ['listingLimit', 'upgradePrompt.listingLimitTitle', 'upgradePrompt.listingLimitMessage'],
    ['tradeFeature', 'trade.featureTitle', 'upgradePrompt.tradeFeatureMessage'],
    ['collectionFeature', 'membership.featureDigitalGarage', 'upgradePrompt.collectionFeatureMessage'],
    ['featureListing', 'upgradePrompt.featureListingTitle', 'upgradePrompt.featureListingMessage'],
    ['messageLimit', 'upgradePrompt.messageLimitTitle', 'upgradePrompt.messageLimitMessage'],
    ['savedSearchLimit', 'membership.savedSearchLimitTitle', 'membership.savedSearchLimitMessage'],
    ['imageLimit', 'upgradePrompt.imageLimitTitle', 'upgradePrompt.imageLimitMessage'],
    ['valueLimit', 'membership.valueLimitTitle', 'membership.valueLimitMessage'],
  ];

  it.each(cases)('%s → başlık %s, mesaj %s', (promptType, expectedTitle, expectedMessage) => {
    const result = getUpgradeMessage(t, promptType);
    expect(result.title).toBe(expectedTitle);
    expect(result.message).toBe(expectedMessage);
  });

  it('addressLimit interpolasyonlu mesaj döner (max limit)', () => {
    const result = getUpgradeMessage(t, 'addressLimit');
    expect(result.title).toBe('address.limitTitle');
    expect(result.message).toBe('address.limitBody');
  });
});
