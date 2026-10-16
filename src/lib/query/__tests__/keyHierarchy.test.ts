/**
 * Invalidasyon hiyerarşisi — mutasyonların kökü (`qk.<domain>.all`) kullanıcının gördüğü
 * sorguları KAPSAMALI. Önceden Takaslarım sayaçları (`trades-status-counts`), profil üyelik
 * rozeti (`membership-me`) ve satış detayı (`sale-order`) ayrı köklerdeydi; aksiyon sonrası
 * bayat kalıyorlardı.
 */
import { QueryClient } from '@tanstack/react-query';
import { isNotFoundError, qk } from '@/lib/query';

const startsWith = (key: readonly unknown[], root: readonly unknown[]) =>
  root.every((part, i) => key[i] === part);

describe('qk hiyerarşisi', () => {
  it('takas sayaçları trades kökünün altında', () => {
    expect(startsWith(qk.trades.statusCounts, qk.trades.all)).toBe(true);
    expect(startsWith(qk.trades.statusCountBy('cancelled'), qk.trades.all)).toBe(true);
    expect(startsWith(qk.trades.list({ filter: 'all' }), qk.trades.all)).toBe(true);
  });

  it('üyelik anahtarları tek membership kökünde', () => {
    for (const key of [qk.membership.me, qk.membership.current, qk.membership.tiers, qk.membershipLimits.mine]) {
      expect(startsWith(key, qk.membership.all)).toBe(true);
    }
    // Profil rozeti (tier string) ile yönetim ekranı (tam gövde) aynı önbelleği paylaşmaz.
    expect(qk.membership.me).not.toEqual(qk.membership.current);
  });

  it('satıcı sipariş sorguları orders kökünün altında', () => {
    for (const key of [
      qk.orders.sellerList('all'),
      qk.orders.sellerEarnings,
      qk.orders.sellerPending,
      qk.orders.saleDetail('o1'),
      qk.orders.group('g1'),
    ]) {
      expect(startsWith(key, qk.orders.all)).toBe(true);
    }
  });

  it('çakışan yapraklar ayrıldı', () => {
    expect(qk.products.myListingsForCollection).not.toEqual(qk.products.myListings('all'));
    expect(qk.seller.dashboardStats(false)).not.toEqual(qk.seller.stats('false'));
    expect(qk.trades.myTradeable('u1', 'l1')).not.toEqual(qk.trades.myTradeableForCounter('u1'));
    expect(qk.payments.history).not.toEqual(qk.payments.list(''));
  });

  it('kök invalidasyonu gerçek QueryClient eşleşmesinde de yaprakları yakalar', async () => {
    const client = new QueryClient();
    client.setQueryData(qk.trades.statusCounts, { all: 1 });
    client.setQueryData(qk.membership.me, 'premium');
    client.setQueryData(qk.orders.saleDetail('o1'), { id: 'o1' });
    await client.invalidateQueries({ queryKey: qk.trades.all });
    await client.invalidateQueries({ queryKey: qk.membership.all });
    await client.invalidateQueries({ queryKey: qk.orders.all });
    expect(client.getQueryState(qk.trades.statusCounts)?.isInvalidated).toBe(true);
    expect(client.getQueryState(qk.membership.me)?.isInvalidated).toBe(true);
    expect(client.getQueryState(qk.orders.saleDetail('o1'))?.isInvalidated).toBe(true);
    client.clear();
  });
});

describe('isNotFoundError', () => {
  it('yalnız 404 "bulunamadı" sayılır', () => {
    expect(isNotFoundError({ response: { status: 404 } })).toBe(true);
    expect(isNotFoundError({ response: { status: 500 } })).toBe(false);
    expect(isNotFoundError(new Error('Network Error'))).toBe(false);
    expect(isNotFoundError(null)).toBe(false);
  });
});
