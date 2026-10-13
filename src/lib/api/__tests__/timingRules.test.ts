/**
 * Parite A-3.1 · API yüzeyi: `GET /timing-rules` herkese açık (oturumsuz
 * istemciyle çağrılır).
 */
jest.mock('../client', () => ({
  api: { get: jest.fn(() => Promise.resolve({ data: [] })) },
  guestApi: { get: jest.fn(() => Promise.resolve({ data: {} })) },
}));

import { api, guestApi } from '../client';
import { timingRulesApi, PUBLIC_TIMING_RULE_IDS } from '../timingRules';

beforeEach(() => jest.clearAllMocks());

describe('timingRulesApi', () => {
  it('politikayı oturumsuz istemciyle GET /timing-rules ucundan ister', async () => {
    await timingRulesApi.getPolicy();
    expect(guestApi.get).toHaveBeenCalledWith('/timing-rules');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('kimlik listesi ana repodaki PUBLIC_TIMING_RULE_IDS ile aynı', () => {
    expect(PUBLIC_TIMING_RULE_IDS).toEqual([
      'listingTtlDays',
      'listingExpiryWarningDays',
      'offerExpiryHours',
      'tradeResponseHours',
      'tradePaymentHours',
      'tradeShippingDays',
      'tradeConfirmationDays',
      'tradeHoldDays',
      'preparingDeadlineDays',
      'returnWindowDays',
      'orderPaymentWindowHours',
      'payoutGraceDays',
      'returnDropoffDays',
      'returnInspectionHours',
    ]);
  });
});
