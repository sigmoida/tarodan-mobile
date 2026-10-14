/**
 * Hesap silme reddi → başlık + engel listesi + yollar. İlan engeli YALNIZ rezerve
 * ilanları sayar (aktif/onay bekleyen ilanlar silmede pasife alınır) → Satışlarım;
 * "İlanlarımı yönet" yolu yok.
 */
import { matchesDeleteKeyword } from '../_lib/confirm';
import { deleteAccountPaths, describeDeleteAccountError } from '../_lib/deleteAccountError';

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
      blocked({ activeProducts: 2, pendingOrders: 1, activeTrades: 3 }, ['a', 'b', 'c']),
      'fallback',
    );
    expect(r).toEqual({
      title: 'Hesabınızı silmek için aşağıdaki işlemleri tamamlamanız gerekmektedir:',
      reasons: ['a', 'b', 'c'],
      blocked: true,
      reservedListings: 2,
      pendingOrders: 1,
      activeTrades: 3,
    });
  });

  it('başlık errorText ile: dizi mesaj birleşir, boş mesaj fallback\'e düşer; boş engel atlanır', () => {
    const arr = { response: { status: 400, data: { message: ['A', '', 'B'], errors: ['x', '', 7] } } };
    const r = describeDeleteAccountError(arr, 'f');
    expect(r.title).toBe('A\nB');
    expect(r.reasons).toEqual(['x']);
    const empty = { response: { status: 400, data: { message: '', errors: ['x'] } } };
    expect(describeDeleteAccountError(empty, 'Hesap silinemedi').title).toBe('Hesap silinemedi');
  });

  it('ağ hatası: fallback, engel yok, sayaçlar sıfır', () => {
    expect(describeDeleteAccountError(new Error('Network'), 'Hesap silinemedi')).toEqual({
      title: 'Hesap silinemedi',
      reasons: [],
      blocked: false,
      reservedListings: 0,
      pendingOrders: 0,
      activeTrades: 0,
    });
  });

  it('engel listesi yoksa details yok sayılır', () => {
    const r = describeDeleteAccountError(blocked({ activeProducts: 2 }, []), 'f');
    expect(r.blocked).toBe(false);
    expect(r.reservedListings).toBe(0);
  });
});

describe('deleteAccountPaths', () => {
  const f = (reservedListings: number, pendingOrders = 0, activeTrades = 0) => ({
    reservedListings,
    pendingOrders,
    activeTrades,
  });

  it('rezerve ilan → Satışlarım (İlanlarım yolu yok)', () => {
    expect(deleteAccountPaths(f(1))).toEqual([{ key: 'sales', href: '/sales' }]);
  });

  it('takas ve sipariş engelleri kendi ekranlarına', () => {
    expect(deleteAccountPaths(f(1, 2, 1)).map((p) => p.href)).toEqual(['/sales', '/trades', '/orders']);
    expect(deleteAccountPaths(f(0, 1)).map((p) => p.key)).toEqual(['orders']);
  });

  it('iade / ödeme / blokaj engelinde yol yok (beklenen süreç)', () => {
    expect(deleteAccountPaths(f(0))).toEqual([]);
  });
});

describe('matchesDeleteKeyword', () => {
  it('büyük/küçük harf duyarlı, baş/son boşluk yok sayılır', () => {
    expect(matchesDeleteKeyword('SİL', 'SİL')).toBe(true);
    expect(matchesDeleteKeyword(' SİL ', 'SİL')).toBe(true);
    expect(matchesDeleteKeyword('sil', 'SİL')).toBe(false);
    expect(matchesDeleteKeyword('SIL', 'SİL')).toBe(false);
    expect(matchesDeleteKeyword('DELETE', 'DELETE')).toBe(true);
    expect(matchesDeleteKeyword('', '')).toBe(false);
  });
});
