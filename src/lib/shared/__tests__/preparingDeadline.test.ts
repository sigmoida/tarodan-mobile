/**
 * Parite A-3.1 · Kargoya verme son tarihi notu (web
 * `orders/[id]/_lib/preparing-deadline.test.ts` aynası). Tarih sunucudan gelir
 * (uzatmada yeni tarih); not yalnız parası alınmış, koli taşıyıcıya
 * devredilmemiş ve son tarihi geçmemiş siparişte görünür.
 */
import i18n from '@/i18n/config';
import {
  preparingDeadlineCopy,
  preparingDeadlineNoticeOf,
  type PreparingDeadlineOrder,
} from '../preparingDeadline';

const NOW = new Date('2026-10-08T09:00:00.000Z');
const DEADLINE = '2026-10-10T09:00:00.000Z';

const order = (overrides: Partial<PreparingDeadlineOrder> = {}): PreparingDeadlineOrder => ({
  status: 'preparing',
  orderNumber: 'ORD-1',
  preparingDeadline: DEADLINE,
  preparingExtendedAt: null,
  ...overrides,
});

describe('preparingDeadlineNoticeOf', () => {
  it('sunucunun son tarihini alıcıya gösterir', () => {
    expect(preparingDeadlineNoticeOf(order(), 'buyer', NOW)).toEqual({
      deadline: DEADLINE,
      extended: false,
      audience: 'buyer',
    });
  });

  it('tek seferlik uzatmayı işaretler, satıcıya satıcı metni', () => {
    expect(
      preparingDeadlineNoticeOf(order({ preparingExtendedAt: '2026-10-07T09:00:00.000Z' }), 'seller', NOW),
    ).toEqual({ deadline: DEADLINE, extended: true, audience: 'seller' });
  });

  it("API statüleri (paid/preparing) ve sipariş detayının UI adı 'processing' kabul edilir", () => {
    expect(preparingDeadlineNoticeOf(order({ status: 'paid' }), 'buyer', NOW)).not.toBeNull();
    expect(preparingDeadlineNoticeOf(order({ status: 'processing' }), 'buyer', NOW)).not.toBeNull();
  });

  it('kargo öncesi olmayan statülerde yok', () => {
    for (const status of ['pending_payment', 'pending', 'shipped', 'delivered', 'cancelled', 'refunded']) {
      expect(preparingDeadlineNoticeOf(order({ status }), 'buyer', NOW)).toBeNull();
    }
  });

  it('etiket var ama koli devredilmemişken görünür', () => {
    expect(
      preparingDeadlineNoticeOf(order({ shipment: { status: 'label_created', shippedAt: null } }), 'buyer', NOW),
    ).not.toBeNull();
  });

  it('koli taşıyıcıdaysa yok — hareket eden durum ya da shippedAt mührü', () => {
    expect(
      preparingDeadlineNoticeOf(order({ shipment: { status: 'in_transit' } }), 'buyer', NOW),
    ).toBeNull();
    expect(
      preparingDeadlineNoticeOf(
        order({ shipment: { status: 'pending', shippedAt: '2026-10-08T08:00:00.000Z' } }),
        'buyer',
        NOW,
      ),
    ).toBeNull();
  });

  it('son tarih geçmişse ya da yoksa/bozuksa yok', () => {
    expect(preparingDeadlineNoticeOf(order({ preparingDeadline: '2026-10-08T08:59:00.000Z' }), 'buyer', NOW)).toBeNull();
    expect(preparingDeadlineNoticeOf(order({ preparingDeadline: null }), 'buyer', NOW)).toBeNull();
    expect(preparingDeadlineNoticeOf(order({ preparingDeadline: 'garbage' }), 'buyer', NOW)).toBeNull();
  });

  it('üyelik siparişinde yok (alan ya da MEM- öneki)', () => {
    expect(preparingDeadlineNoticeOf(order({ isMembership: true }), 'buyer', NOW)).toBeNull();
    expect(preparingDeadlineNoticeOf(order({ orderNumber: 'MEM-1' }), 'buyer', NOW)).toBeNull();
  });
});

describe('preparingDeadlineCopy (web anahtarları)', () => {
  const t = i18n.getFixedT('tr');

  it('normal: "Kargoya verme son tarihi" + tarafa göre gövde', () => {
    const buyer = preparingDeadlineCopy({ deadline: DEADLINE, extended: false, audience: 'buyer' }, t);
    expect(buyer.title).toMatch(/^Kargoya verme son tarihi: \d{2}\.\d{2}\.2026/);
    expect(buyer.body).toBe(t('order.preparingDeadlineBuyer'));
    const seller = preparingDeadlineCopy({ deadline: DEADLINE, extended: false, audience: 'seller' }, t);
    expect(seller.body).toBe('Siparişi bu tarihe kadar kargoya vermeniz gerekiyor.');
  });

  it('uzatılmış: satıcıya "son süre", alıcıya gecikme + iptal hakkı', () => {
    const seller = preparingDeadlineCopy({ deadline: DEADLINE, extended: true, audience: 'seller' }, t);
    expect(seller.title).toMatch(/^Kargo süresi bir kez uzatıldı — yeni son tarih: /);
    expect(seller.body).toBe(t('order.preparingExtendedSeller'));
    const buyer = preparingDeadlineCopy({ deadline: DEADLINE, extended: true, audience: 'buyer' }, t);
    expect(buyer.body).toMatch(/Kargoya verilene kadar siparişi iptal edebilirsiniz\.$/);
  });
});
