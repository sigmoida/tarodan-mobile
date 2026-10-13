/**
 * `toOrderLineItems` — quote ve sipariş gövdelerinin TEK satır üreticisi (Parite A-1.1).
 *
 * Sunucu fiyat imzasına adedi katıyor; iki gövde ayrı ayrı kurulduğunda
 * checkout adedi düşürüyordu (sunucu `quantity ?? 1` → 409 `pricingChanged`).
 */
import { toOrderLineItems } from '../_lib/lineItems';

describe('toOrderLineItems', () => {
  it('her satırın adedini korur', () => {
    expect(
      toOrderLineItems([
        { productId: 'p1', quantity: 3 },
        { productId: 'p2', quantity: 1 },
      ]),
    ).toEqual([
      { productId: 'p1', quantity: 3 },
      { productId: 'p2', quantity: 1 },
    ]);
  });

  it('sepet satırındaki fiyat/başlık gibi alanları gövdeye sızdırmaz', () => {
    const cartLine = {
      id: 'cart-1',
      productId: 'p1',
      quantity: 2,
      price: 100,
      title: 'Model Araba',
    };

    expect(toOrderLineItems([cartLine])).toEqual([{ productId: 'p1', quantity: 2 }]);
    expect(Object.keys(toOrderLineItems([cartLine])[0]!)).toEqual(['productId', 'quantity']);
  });

  it('boş sepet → boş liste', () => {
    expect(toOrderLineItems([])).toEqual([]);
  });
});
