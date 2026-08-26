/**
 * Misafir iptali kapısı — `canGuestCancel`.
 *
 * Sunucu kargoya verilmiş siparişte `server.order.cancelAfterHandover` ile 400
 * atıyor. Butonu o durumda göstermek kullanıcıyı doğrudan bir hataya yürütür,
 * o yüzden kapı ekranda da var. `POST /orders/guest/cancel` ucunun canlı olduğu
 * staging'de ölçüldü (2026-08-26): boş gövde 404 değil 400 dönüyor.
 */
import { canGuestCancel, GUEST_CANCELLABLE_STATUSES } from '../_lib/status';
import type { OrderStatus } from '../_lib/status';

const order = (over: Partial<OrderStatus>): OrderStatus =>
  ({
    id: 'o1',
    orderNumber: 'ORD-1',
    status: 'paid',
    totalAmount: 100,
    createdAt: '2026-08-01T00:00:00.000Z',
    product: { title: 'x', images: [] },
    ...over,
  }) as OrderStatus;

describe('canGuestCancel', () => {
  it.each(GUEST_CANCELLABLE_STATUSES)('%s durumunda iptal sunulur', (status) => {
    expect(canGuestCancel(order({ status }))).toBe(true);
  });

  it.each(['shipped', 'delivered', 'completed', 'cancelled', 'refunded'])(
    '%s durumunda iptal SUNULMAZ',
    (status) => {
      expect(canGuestCancel(order({ status }))).toBe(false);
    },
  );

  // Kargo kaydı `pending`den çıkmışsa etiket kesilmiş/koli teslim alınmış
  // demektir — durum alanı henüz `shipped`e dönmemiş olsa bile sunucu reddeder.
  it('kargo kaydı pending değilse durum uygun olsa da iptal sunmaz', () => {
    expect(
      canGuestCancel(
        order({
          status: 'preparing',
          shipment: { trackingNumber: 'PKG-1', provider: 'surat', status: 'picked_up' },
        }),
      ),
    ).toBe(false);
  });

  it('kargo kaydı henüz pending iken iptal sunulur', () => {
    expect(
      canGuestCancel(
        order({
          status: 'paid',
          shipment: { trackingNumber: 'PKG-1', provider: 'surat', status: 'pending' },
        }),
      ),
    ).toBe(true);
  });

  it('sipariş yokken (henüz sorgulanmadı) iptal sunmaz', () => {
    expect(canGuestCancel(null)).toBe(false);
    expect(canGuestCancel(undefined)).toBe(false);
  });
});
