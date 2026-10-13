/**
 * Profil menüsü (web ProfileSidebar grupları): grup sırası/başlıkları, mağaza kapısı (üyelik/abonelik
 * satırları), kurumsal satırlar ve rota/testID sözleşmesi.
 */
import { schemaT } from '@/test-utils';
import { buildProfileMenuGroups, type ProfileMenuContext } from '../profileMenu';

const base: ProfileMenuContext = {
  isBusiness: false,
  showMembership: false,
  isPaidTier: false,
  tierLabel: 'Premium',
  isBusinessTier: false,
};
const items = (ctx: Partial<ProfileMenuContext> = {}) =>
  buildProfileMenuGroups(schemaT, { ...base, ...ctx }).flatMap((g) => g.items);

describe('buildProfileMenuGroups', () => {
  it('web ProfileSidebar sırası: Alışveriş, Finans, Koleksiyon, Analiz, İletişim, Hesap, Bilgi', () => {
    const groups = buildProfileMenuGroups(schemaT, base);
    expect(groups.map((g) => g.key)).toEqual([
      'commerce', 'finance', 'collection', 'insights', 'messaging', 'account', 'info',
    ]);
    expect(groups.slice(0, 6).map((g) => g.title)).toEqual([
      'Alışveriş', 'Finans', 'Koleksiyon', 'Analiz', 'İletişim', 'Hesap',
    ]);
  });

  it('üyelik/abonelik satırları yalnız satın alma açıkken ya da ücretli üyede gelir (Apple 2.1(b))', () => {
    expect(items().some((i) => i.key === 'membership' || i.key === 'subscription')).toBe(false);
    const paid = items({ showMembership: true, isPaidTier: true });
    expect(paid.find((i) => i.key === 'membership')?.rightBadge).toBe('Premium');
    expect(paid.some((i) => i.key === 'subscription')).toBe(true);
  });

  it('işletme paneli yalnız business katmanında, kurumsal başvuru yalnız kurumsal hesapta', () => {
    expect(items().some((i) => i.key === 'business' || i.key === 'business-application')).toBe(false);
    expect(items({ isBusinessTier: true }).find((i) => i.key === 'business')?.to).toBe('/settings/business');
    expect(items({ isBusiness: true }).find((i) => i.key === 'business-application')?.to).toBe(
      '/settings/business-application',
    );
  });

  it('bekleyen iş sayaçları teklif ve takas satırlarına bağlıdır', () => {
    const all = items();
    expect(all.find((i) => i.key === 'trades')?.badgeKey).toBe('pendingTrades');
    expect(all.find((i) => i.key === 'offers')?.badgeKey).toBe('pendingOffers');
  });

  it('satır anahtarları ve rotalar tekil; hiçbir satırda ₺ ya da ikon alanı yok', () => {
    const all = items({ showMembership: true, isBusiness: true, isBusinessTier: true });
    expect(new Set(all.map((i) => i.key)).size).toBe(all.length);
    for (const i of all) {
      expect(i.to.startsWith('/')).toBe(true);
      expect(i.label).not.toMatch(/₺/);
      expect(i).not.toHaveProperty('icon');
    }
  });

  it('web etiketleri: "Takip Ettiklerim" ve "Engellenen Kullanıcılar"', () => {
    const all = items();
    expect(all.find((i) => i.key === 'account-following')?.label).toBe('Takip Ettiklerim');
    expect(all.find((i) => i.key === 'blocked')?.label).toBe('Engellenen Kullanıcılar');
  });
});
