/**
 * Push dokunuşu uçtan uca: API push payload'ı `{ ...dto.data, type }` — `link` ve
 * (satıcı tiplerinde) `audience` YOK. routeFromNotification yine de satıcıyı
 * satış ekranına götürmeli.
 */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

import { routeFromNotification } from '../push';

describe('routeFromNotification — satıcı push dokunuşu', () => {
  beforeEach(() => mockPush.mockClear());

  it('order_cancelled_seller (link/audience yok) -> /sales/:id', () => {
    routeFromNotification({ orderId: 'o1', type: 'order_cancelled_seller' });
    expect(mockPush).toHaveBeenCalledWith('/sales/o1');
  });

  it('order_cancelled (alıcı, link yok) -> /orders/:id', () => {
    routeFromNotification({ orderId: 'o1', type: 'order_cancelled' });
    expect(mockPush).toHaveBeenCalledWith('/orders/o1');
  });
});
