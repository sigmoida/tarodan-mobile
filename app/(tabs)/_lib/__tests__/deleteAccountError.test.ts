/**
 * B-2.6 · Hesap silme reddi: engel listesi gösterilir (web gibi); yol yalnız
 * izlenebilecekse verilir — kapatılabilir ilan → İlanlarım, rezerve (satışa
 * bağlı) ilan → açıklama + Satışlarım, bekleyen sipariş → Siparişlerim.
 */
import { deleteAccountPaths, describeDeleteAccountError } from '../deleteAccountError';

const blocked = (details: Record<string, number>, errors: string[]) => ({
  response: {
    status: 400,
    data: {
      message: 'Hesabınızı silmek için aşağıdaki işlemleri tamamlamanız gerekmektedir:',
      i18nKey: 'server.user.deleteAccountBlocked',
      errors,
      details,
    },
  },
});

describe('describeDeleteAccountError', () => {
  it('engel listesi ve sayısal ayrıntı çözülür', () => {
    const r = describeDeleteAccountError(
      blocked({ activeProducts: 2, pendingOrders: 1 }, ['2 aktif ilanınız var.', '1 bekleyen sipariş.']),
      'fallback',
    );
    expect(r.blockingListings).toBe(2);
    expect(r.pendingOrders).toBe(1);
    expect(r.blocked).toBe(true);
    expect(r.message).toBe(
      'Hesabınızı silmek için aşağıdaki işlemleri tamamlamanız gerekmektedir:\n• 2 aktif ilanınız var.\n• 1 bekleyen sipariş.',
    );
  });

  it('ilan/sipariş dışı engelde (iade) yol düğmesi yok', () => {
    const r = describeDeleteAccountError(blocked({ activeProducts: 0, openRefunds: 1 }, ['1 açık iade.']), 'f');
    expect(r.blockingListings).toBe(0);
    expect(r.blocked).toBe(true);
    expect(deleteAccountPaths(r, null)).toEqual({
      manageListings: false,
      reservedListings: 0,
      sales: false,
      orders: false,
    });
  });

  it('başlık errorText ile: dizi mesaj birleşir, boş mesaj fallback\'e düşer', () => {
    const arr = { response: { status: 400, data: { message: ['A', '', 'B'], errors: ['x'] } } };
    expect(describeDeleteAccountError(arr, 'f').message).toBe('A\nB\n• x');
    const empty = { response: { status: 400, data: { message: '', errors: ['x'] } } };
    expect(describeDeleteAccountError(empty, 'Hesap silinemedi').message).toBe('Hesap silinemedi\n• x');
  });

  it('ağ hatası: fallback metin, engel yok', () => {
    expect(describeDeleteAccountError(new Error('Network'), 'Hesap silinemedi')).toEqual({
      message: 'Hesap silinemedi',
      blocked: false,
      blockingListings: 0,
      pendingOrders: 0,
    });
  });
});

describe('deleteAccountPaths', () => {
  const failure = (blockingListings: number, pendingOrders = 0) => ({ blockingListings, pendingOrders });

  it('kapatılabilir aktif ilan → İlanlarımı yönet', () => {
    expect(deleteAccountPaths(failure(2), { active: 2, pending: 0, reserved: 0 })).toEqual({
      manageListings: true,
      reservedListings: 0,
      sales: false,
      orders: false,
    });
  });

  it('onay bekleyen ilan da İlanlarım\'dan silinebilir → İlanlarımı yönet', () => {
    expect(deleteAccountPaths(failure(1), { active: 0, pending: 1, reserved: 0 }).manageListings).toBe(true);
  });

  it('yalnız rezerve ilan: İlanlarımı yönet YOK; açıklama + Satışlarım', () => {
    expect(deleteAccountPaths(failure(1, 1), { active: 0, pending: 0, reserved: 1 })).toEqual({
      manageListings: false,
      reservedListings: 1,
      sales: true,
      orders: false,
    });
  });

  it('aktif + rezerve: iki yol (Android uyarısı en çok 3 düğme)', () => {
    const p = deleteAccountPaths(failure(3, 1), { active: 2, pending: 0, reserved: 1 });
    expect(p.manageListings && p.sales).toBe(true);
    expect(p.orders).toBe(false);
  });

  it('ilan yok, bekleyen sipariş var → Siparişlerim', () => {
    expect(deleteAccountPaths(failure(0, 2), null)).toEqual({
      manageListings: false,
      reservedListings: 0,
      sales: false,
      orders: true,
    });
  });

  it('sayaçlar alınamadı ya da engelle çelişiyor → İlanlarım yolu yine verilir', () => {
    expect(deleteAccountPaths(failure(1), null).manageListings).toBe(true);
    expect(deleteAccountPaths(failure(1), { active: 0, pending: 0, reserved: 0 }).manageListings).toBe(true);
  });
});
