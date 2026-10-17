const mockPush = jest.fn();
const mockDismissTo = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    dismissTo: (...a: unknown[]) => mockDismissTo(...a),
  },
}));

import { navigateTo, tabHrefFor } from '../goTo';

beforeEach(() => {
  mockPush.mockClear();
  mockDismissTo.mockClear();
});

describe('tabHrefFor', () => {
  it.each([
    ['/', '/(tabs)'],
    ['/(tabs)', '/(tabs)'],
    ['/cart', '/(tabs)/cart'],
    ['/cart/', '/(tabs)/cart'],
    ['/favorites', '/(tabs)/favorites'],
    ['/profile', '/(tabs)/profile'],
    ['/sell', '/(tabs)/sell'],
    ['/(tabs)/profile', '/(tabs)/profile'],
    ['/cart?x=1', '/(tabs)/cart?x=1'],
  ])('%s -> %s', (href, tab) => {
    expect(tabHrefFor(href)).toBe(tab);
  });

  it.each(['/messages', '/notifications', '/orders/1', '/profile/orders', '/product/9', ''])(
    '%s sekme değil',
    (href) => {
      expect(tabHrefFor(href)).toBeNull();
    },
  );
});

describe('navigateTo', () => {
  it('sekme hedefi dismissTo (ikinci (tabs) itilmez)', () => {
    navigateTo('/cart');
    expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/cart');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('yığın hedefi push', () => {
    navigateTo('/orders/o1');
    expect(mockPush).toHaveBeenCalledWith('/orders/o1');
    expect(mockDismissTo).not.toHaveBeenCalled();
  });
});
