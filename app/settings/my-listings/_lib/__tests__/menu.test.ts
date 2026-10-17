/**
 * İlan eylem menüsü: durum → görünür satırlar (ActionSheet `actions`), sil yıkıcı ve en altta.
 */
import { buildListingMenuActions } from '../menu';
import type { Listing } from '../types';

const t = ((key: string) => key) as never;

const listing = (over: Partial<Listing> = {}): Listing => ({
  id: 'l1',
  title: 'Ferrari F40',
  price: 100,
  status: 'active',
  viewCount: 0,
  images: [],
  createdAt: '',
  updatedAt: '',
  condition: 'new',
  ...over,
});

const keys = (l: Listing, canBoost = true) =>
  buildListingMenuActions(l, t, jest.fn(), canBoost).map((a) => a.key);

describe('buildListingMenuActions', () => {
  it('aktif ilan: görüntüle, düzenle, öne çıkar, pasife al, sil', () => {
    expect(keys(listing())).toEqual(['view', 'edit', 'boost', 'deactivate', 'delete']);
  });

  it('dijital satın alma kapalıyken (iOS) "öne çıkar" yok', () => {
    expect(keys(listing(), false)).toEqual(['view', 'edit', 'deactivate', 'delete']);
  });

  it('pasif ilan yeniden yayınlanır; süresi dolan ilan "yenile" etiketini alır', () => {
    expect(keys(listing({ status: 'inactive' }))).toEqual(['view', 'edit', 'relist', 'delete']);
    const labels = buildListingMenuActions(
      listing({ status: 'inactive', inactiveReason: 'expired' }),
      t,
      jest.fn(),
      true,
    ).map((a) => a.label);
    expect(labels).toContain('profile.expiredListings.renew');
  });

  it('satılan / askıya alınan ilan düzenlenemez; silinen ilanda görüntüle yok', () => {
    expect(keys(listing({ status: 'sold' }))).toEqual(['view', 'delete']);
    expect(keys(listing({ status: 'suspended' }))).toEqual(['view', 'delete']);
    expect(keys(listing({ status: 'deleted' }))).toEqual(['delete']);
  });

  it('sil yıkıcıdır ve son satırdır; satır eylemi (anahtar, ilan) ile çağrılır', () => {
    const onAction = jest.fn();
    const l = listing();
    const actions = buildListingMenuActions(l, t, onAction, true);
    const last = actions[actions.length - 1]!;
    expect(last.key).toBe('delete');
    expect(last.destructive).toBe(true);
    expect(actions.filter((a) => a.destructive)).toHaveLength(1);
    last.onPress();
    expect(onAction).toHaveBeenCalledWith('delete', l);
  });
});
