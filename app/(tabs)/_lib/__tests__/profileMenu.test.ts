/**
 * Menü modeli (web ProfileSidebar grupları): grup sırası/başlıkları, yüzey ayrımı (profil / yan
 * menü), misafir seçimi, mağaza kapısı (üyelik/abonelik satırları), kurumsal satırlar ve
 * rota/testID sözleşmesi.
 */
import { schemaT } from '@/test-utils';
import {
  buildProfileMenuGroups,
  selectDrawerSections,
  selectProfileSections,
  type ProfileMenuContext,
} from '../profileMenu';

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

  it('yüzey ayrımı: profilde yalnız Hesap; yan menüde Hesap hariç hepsi; hiçbir grup iki yüzeyde değil', () => {
    const groups = buildProfileMenuGroups(schemaT, base);
    expect(selectProfileSections(groups).map((g) => g.key)).toEqual(['account']);
    expect(selectDrawerSections(groups, { isGuest: false }).map((g) => g.key)).toEqual([
      'commerce', 'finance', 'collection', 'insights', 'messaging', 'info',
    ]);
    const profileKeys = selectProfileSections(groups).flatMap((g) => g.items.map((i) => i.key));
    const drawerKeys = selectDrawerSections(groups, { isGuest: false }).flatMap((g) => g.items.map((i) => i.key));
    expect(profileKeys.filter((k) => drawerKeys.includes(k))).toEqual([]);
  });

  it('Hesap grubu: adresler, banka hesabı/IBAN, bildirim ayarları, güvenlik, dil, engellenenler', () => {
    const keys = selectProfileSections(buildProfileMenuGroups(schemaT, base)).flatMap((g) =>
      g.items.map((i) => i.key),
    );
    expect(keys).toEqual(
      expect.arrayContaining(['addresses', 'bank-account', 'notification-settings', 'security', 'language', 'blocked']),
    );
  });

  it('Favoriler (alt menü sekmesi) ve Mesajlar/Bildirimler (üst bar düğmeleri) menüde tekrarlanmaz; sabit grup yok', () => {
    const groups = buildProfileMenuGroups(schemaT, base);
    expect(groups.some((g) => g.key === 'pinned')).toBe(false);
    const commerce = groups.find((g) => g.key === 'commerce');
    expect(commerce?.items[0]).toMatchObject({ key: 'listings' });
    const all = groups.flatMap((g) => g.items);
    expect(all.some((i) => i.to === '/favorites' || i.to === '/cart')).toBe(false);
    expect(all.some((i) => i.to === '/messages' || i.to === '/notifications')).toBe(false);
  });

  it('misafir seçimi: yalnız guest gruplar (İletişim → yardım, Bilgi); authOnly satırlar düşer', () => {
    const guest = selectDrawerSections(buildProfileMenuGroups(schemaT, base), { isGuest: true });
    expect(guest.map((g) => g.key)).toEqual(['messaging', 'info']);
    expect(guest[0]!.items.map((i) => i.key)).toEqual(['help']);
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

  it('satır anahtarları ve rotalar tekil; hiçbir satırda ₺ yok', () => {
    const all = items({ showMembership: true, isBusiness: true, isBusinessTier: true });
    expect(new Set(all.map((i) => i.key)).size).toBe(all.length);
    for (const i of all) {
      expect(i.to.startsWith('/')).toBe(true);
      expect(i.label).not.toMatch(/₺/);
    }
  });

  it('Hesap (profil) satırlarının tümü ikon taşır; yan menü satırları taşımaz (kendi eşlemesi var)', () => {
    const groups = buildProfileMenuGroups(schemaT, {
      showMembership: true,
      isBusiness: true,
      isBusinessTier: true,
      isPaidTier: true,
      tierLabel: 'Pro',
    });
    for (const g of groups) {
      for (const i of g.items) {
        if (g.surface === 'profile') expect(i.icon).toBeTruthy();
        else expect(i).not.toHaveProperty('icon');
      }
    }
  });

  it('web etiketleri: "Takip Ettiklerim" ve "Engellenen Kullanıcılar"', () => {
    const all = items();
    expect(all.find((i) => i.key === 'account-following')?.label).toBe('Takip Ettiklerim');
    expect(all.find((i) => i.key === 'blocked')?.label).toBe('Engellenen Kullanıcılar');
  });
});
