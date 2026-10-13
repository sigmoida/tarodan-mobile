/**
 * Parite A-3.1 / A-3.4 · API yüzeyi.
 *  - `GET /timing-rules` herkese açık (oturumsuz istemciyle çağrılır).
 *  - e-Arşiv belgeleri `/elogo/invoices/by-order/:id/all` ile LİSTE olarak okunur;
 *    tekil uç (yalnız ilk belge) artık çağrılmaz.
 */
jest.mock('../client', () => ({
  api: { get: jest.fn(() => Promise.resolve({ data: [] })) },
  guestApi: { get: jest.fn(() => Promise.resolve({ data: {} })) },
}));

import { api, guestApi } from '../client';
import { timingRulesApi, PUBLIC_TIMING_RULE_IDS } from '../timingRules';
import { elogoInvoicesApi } from '../orders';

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

describe('elogoInvoicesApi', () => {
  it('siparişin TÜM belgelerini /all ucundan ister', async () => {
    await elogoInvoicesApi.byOrderAll('order-1');
    expect(api.get).toHaveBeenCalledWith('/elogo/invoices/by-order/order-1/all');
  });

  it('tekil (yalnız ilk belgeyi döndüren) uç yüzeyde yok', () => {
    expect((elogoInvoicesApi as Record<string, unknown>).byOrder).toBeUndefined();
  });
});
