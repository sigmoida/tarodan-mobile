import { isProductTradeOpen } from '../isProductTradeOpen';

describe('isProductTradeOpen', () => {
  it('tradeAvailable tanımlıysa (true/false) eski alanlara baskındır', () => {
    expect(isProductTradeOpen({ tradeAvailable: false, isTradeEnabled: true })).toBe(false);
    expect(isProductTradeOpen({ tradeAvailable: false, trade_available: true, tradeStatus: 'open' })).toBe(false);
    expect(isProductTradeOpen({ tradeAvailable: 'false', isTradeEnabled: true })).toBe(false);
    expect(isProductTradeOpen({ tradeAvailable: true })).toBe(true);
  });

  it('tradeAvailable yoksa (undefined/null) eski alanlara düşer', () => {
    expect(isProductTradeOpen({ isTradeEnabled: true })).toBe(true);
    expect(isProductTradeOpen({ tradeAvailable: null, trade_available: true })).toBe(true);
    expect(isProductTradeOpen({ trade: { available: true } })).toBe(true);
    expect(isProductTradeOpen({ tradeStatus: 'open' })).toBe(true);
    expect(isProductTradeOpen({ trade_enabled: 'yes' })).toBe(true);
  });

  it('sinyal yoksa ya da değer geçersizse kapalı', () => {
    expect(isProductTradeOpen({})).toBe(false);
    expect(isProductTradeOpen(null)).toBe(false);
    expect(isProductTradeOpen({ isTradeEnabled: 'false' })).toBe(false);
  });
});
