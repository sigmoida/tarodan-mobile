import { unwrapSavedCards } from '../savedCards';

describe('unwrapSavedCards', () => {
  const c = {
    id: 'c1',
    last4: '1',
    brand: null,
    expMonth: null,
    expYear: null,
    requireCvv: false,
    isDefault: false,
    autoRenewEligible: false,
  };
  it('dizi ya da { data: [...] } sarmalı', () => {
    expect(unwrapSavedCards([c])).toEqual([c]);
    expect(unwrapSavedCards({ data: [c] })).toEqual([c]);
  });
  it('beklenmeyen şekil → boş liste', () => {
    expect(unwrapSavedCards(null)).toEqual([]);
    expect(unwrapSavedCards({ data: 'x' })).toEqual([]);
  });
});
