/**
 * Push dokunuşu uçtan uca: API push payload'ı `{ ...dto.data, type }` — `link` ve
 * (satıcı tiplerinde) `audience` YOK. routeFromNotification yine de satıcıyı
 * satış ekranına götürmeli.
 */
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    dismissTo: (...a: unknown[]) => mockDismissTo(...a),
    navigate: (...a: unknown[]) => mockNavigate(...a),
  },
}));

import { routeFromNotification } from '../push';

describe('routeFromNotification — satıcı push dokunuşu', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockDismissTo.mockClear();
    mockNavigate.mockClear();
  });

  it('order_cancelled_seller (link/audience yok) -> /sales/:id', () => {
    routeFromNotification({ orderId: 'o1', type: 'order_cancelled_seller' });
    expect(mockPush).toHaveBeenCalledWith('/sales/o1');
  });

  it('payment_received ("Yeni Sipariş", eski push: audience yok) -> satış ekranı /sales/:id', () => {
    routeFromNotification({ orderId: 'o1', type: 'payment_received' });
    expect(mockPush).toHaveBeenCalledWith('/sales/o1');
  });

  it('payment_received eski zil linki (/profile/payments) alıcı ekranını açmaz', () => {
    routeFromNotification({ orderId: 'o1', type: 'payment_received', link: '/profile/payments' });
    expect(mockPush).toHaveBeenCalledWith('/sales/o1');
  });

  it('order_cancelled (alıcı, link yok) -> /orders/:id', () => {
    routeFromNotification({ orderId: 'o1', type: 'order_cancelled' });
    expect(mockPush).toHaveBeenCalledWith('/orders/o1');
  });

  it('sekme hedefi (profil) ikinci (tabs) itmez: dismissTo', () => {
    routeFromNotification({ type: 'x', link: '/profile' });
    expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/profile');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('hedef çözülemezse bildirim listesi navigate ile (açıksa kopya itilmez)', () => {
    routeFromNotification({ type: 'unknown_type' });
    expect(mockNavigate).toHaveBeenCalledWith('/notifications');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
