import { activatedStatus, activationMessageKey } from '../activation';

describe('activation — yanıt zarfı', () => {
  it('çıplak ürün gövdesi (gerçek PATCH /products/:id şekli)', () => {
    expect(activatedStatus({ data: { id: 'p1', status: 'active' } })).toBe('active');
    expect(activationMessageKey({ data: { id: 'p1', status: 'active' } })).toBe(
      'listing.reactivatedImmediately',
    );
    expect(activationMessageKey({ data: { id: 'p1', status: 'pending' } })).toBe(
      'listing.sentForReview',
    );
  });

  it('{ data: { data: ürün } } zarfı', () => {
    expect(activatedStatus({ data: { data: { status: 'active' } } })).toBe('active');
    expect(activationMessageKey({ data: { data: { status: 'active' } } })).toBe(
      'listing.reactivatedImmediately',
    );
    expect(activationMessageKey({ data: { data: { status: 'pending' } } })).toBe(
      'listing.sentForReview',
    );
  });

  it('statü yok / bozuk yanıt -> inceleme (güvenli varsayılan)', () => {
    for (const r of [undefined, null, {}, { data: null }, { data: {} }, { data: { status: 1 } }]) {
      expect(activatedStatus(r as any)).toBe('pending');
      expect(activationMessageKey(r as any)).toBe('listing.sentForReview');
    }
  });
});
