/**
 * `offerSignature`: the counter screen refuses to send an offer whose signature equals the one
 * it opened with, mirroring the API's identical-offer check (`counterTrade`: the item ids on both
 * sides sorted, the absolute cash amount and the cash payer). So the signature must change
 * exactly when what is sent changes: not for item order or another spelling of the same amount,
 * not for the payer chip alone when no amount is sent (no payer is sent then), and always for a
 * different amount, payer or item.
 */
import { offerSignature } from '../[id]/_lib/types';

const mine = [{ productId: 'm1' }, { productId: 'm2' }];
const theirs = [{ productId: 't1' }];

describe('offerSignature', () => {
  it('ignores the order of the items, as the API compares sorted ids', () => {
    expect(offerSignature([{ productId: 'm2' }, { productId: 'm1' }], theirs, 'offer', '')).toBe(
      offerSignature(mine, theirs, 'offer', ''),
    );
    expect(offerSignature(mine, [{ productId: 't2' }, { productId: 't1' }], 'offer', '')).toBe(
      offerSignature(mine, [{ productId: 't1' }, { productId: 't2' }], 'offer', ''),
    );
  });

  it('reads trade items (`productId`) and picker rows (`id`) the same way', () => {
    expect(offerSignature([{ id: 'm1' }, { id: 'm2' }], [{ id: 't1' }], 'offer', '12,50')).toBe(
      offerSignature(mine, theirs, 'offer', '12,50'),
    );
  });

  it('keeps the two sides apart: the same ids swapped are another offer', () => {
    expect(offerSignature([{ productId: 'a' }], [{ productId: 'b' }], 'offer', '')).not.toBe(
      offerSignature([{ productId: 'b' }], [{ productId: 'a' }], 'offer', ''),
    );
  });

  it('a different item set is another offer', () => {
    expect(offerSignature([{ productId: 'm1' }], theirs, 'offer', '')).not.toBe(
      offerSignature(mine, theirs, 'offer', ''),
    );
  });

  it.each([
    ['12,50', '12.5'],
    ['12,50', '12,5'],
    ['12', '12,00'],
    ['1250', '1250,'],
  ])('%p and %p are the same amount, so the same offer', (a, b) => {
    for (const dir of ['offer', 'request'] as const) {
      expect(offerSignature(mine, theirs, dir, a)).toBe(offerSignature(mine, theirs, dir, b));
    }
  });

  // A third decimal is refused by the shared parser, not rounded (the field mask never lets
  // one in), so it is no amount like grouping.
  it.each([[''], ['0'], ['0,00'], ['0,004'], ['1.250,50'], ['12,505']])(
    'without an amount (%p) the payer is not sent, so the payer chip alone is no change',
    (cash) => {
      expect(offerSignature(mine, theirs, 'offer', cash)).toBe(offerSignature(mine, theirs, 'request', cash));
      // And every "no amount" text is the same offer as an empty field.
      expect(offerSignature(mine, theirs, 'request', cash)).toBe(offerSignature(mine, theirs, 'offer', ''));
    },
  );

  it('with an amount, who pays is part of the offer', () => {
    expect(offerSignature(mine, theirs, 'offer', '12,50')).not.toBe(offerSignature(mine, theirs, 'request', '12,50'));
  });

  it('a different amount (also by one cent) is another offer', () => {
    expect(offerSignature(mine, theirs, 'offer', '12,50')).not.toBe(offerSignature(mine, theirs, 'offer', '12,51'));
    expect(offerSignature(mine, theirs, 'offer', '12,50')).not.toBe(offerSignature(mine, theirs, 'offer', ''));
    // The decimal comma is a decimal, not dropped: 12,50 is not 1250.
    expect(offerSignature(mine, theirs, 'offer', '12,50')).not.toBe(offerSignature(mine, theirs, 'offer', '1250'));
  });
});
