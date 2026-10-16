/**
 * Menü modeli (web ProfileSidebar grupları): grup sırası/başlıkları, yüzey ayrımı (Profil = işlemler /
 * Ayarlar = hesap + uygulama), misafir seçimi, mağaza kapısı (üyelik/abonelik satırları), kurumsal
 * satırlar ve rota/testID sözleşmesi.
 */
import { schemaT } from '@/test-utils';
import {
  buildProfileMenuGroups,
  selectProfileSections,
  selectSettingsSections,
  type ProfileMenuContext,
} from '../profileMenu';

const base: ProfileMenuContext = {
  isBusiness: false,
  showMembership: false,
  isBusinessTier: false,
};
const items = (ctx: Partial<ProfileMenuContext> = {}) =>
  buildProfileMenuGroups(schemaT, { ...base, ...ctx }).flatMap((g) => g.items);

describe('buildProfileMenuGroups', () => {
  it('grup sırası: Profil (Alışveriş, Finans, Koleksiyon, Analiz) sonra Ayarlar (Hesap, Ödeme ve Banka, Üyelik, Tercihler, Yardım & Destek, Bilgi)', () => {
    const groups = buildProfileMenuGroups(schemaT, base);
    expect(groups.map((g) => g.key)).toEqual([
      'commerce', 'finance', 'collection', 'insights',
      'account', 'payment-settings', 'membership', 'preferences', 'support', 'info',
    ]);
    expect(groups.slice(0, 5).map((g) => g.title)).toEqual([
      'Alışveriş', 'Finans', 'Koleksiyon', 'Analiz', 'Hesap',
    ]);
  });

  it('yüzey ayrımı: Profil = işlemler, Ayarlar = gerisi; hiçbir satır iki yüzeyde değil; boş grup düşer', () => {
    const groups = buildProfileMenuGroups(schemaT, base);
    expect(selectProfileSections(groups).map((g) => g.key)).toEqual(['commerce', 'finance', 'collection', 'insights']);
    // Üyelik grubunun iki satırı da koşullu → nötr bağlamda grup düşer.
    expect(selectSettingsSections(groups, { isGuest: false }).map((g) => g.key)).toEqual([
      'account', 'payment-settings', 'preferences', 'support', 'info',
    ]);
    const profileKeys = selectProfileSections(groups).flatMap((g) => g.items.map((i) => i.key));
    const settingsKeys = selectSettingsSections(groups, { isGuest: false }).flatMap((g) => g.items.map((i) => i.key));
    expect(profileKeys.filter((k) => settingsKeys.includes(k))).toEqual([]);
  });

  it('Ayarlar: profili düzenle, adresler, güvenlik, engellenenler, banka hesabı, kayıtlı kartlar, bildirimler, bülten, dil, destek, yardım', () => {
    const keys = selectSettingsSections(buildProfileMenuGroups(schemaT, base), { isGuest: false }).flatMap((g) =>
      g.items.map((i) => i.key),
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'edit-profile', 'addresses', 'security', 'blocked', 'bank-account', 'payment-methods',
        'notification-settings', 'account-newsletter', 'language', 'support', 'help',
      ]),
    );
  });

  it('Profil Finans: ödemelerim, ödeme geçmişi, iade talepleri (kartlar ve IBAN Ayarlar\'da)', () => {
    const finance = buildProfileMenuGroups(schemaT, base).find((g) => g.key === 'finance');
    expect(finance?.items.map((i) => i.key)).toEqual(['payments', 'payment-history', 'refunds']);
  });

  it('Favoriler (alt menü sekmesi) ve Mesajlar/Bildirimler (üst bar düğmeleri) menüde tekrarlanmaz; sabit grup yok', () => {
    const groups = buildProfileMenuGroups(schemaT, base);
    expect(groups.some((g) => g.key === 'pinned')).toBe(false);
    const commerce = groups.find((g) => g.key === 'commerce');
    expect(commerce?.items[0]).toMatchObject({ key: 'listings' });
    // İşletme paneli (yalnız business katmanı) Alışveriş'in başında.
    const biz = buildProfileMenuGroups(schemaT, { ...base, isBusinessTier: true }).find((g) => g.key === 'commerce');
    expect(biz?.items[0]).toMatchObject({ key: 'business', tone: 'primary' });
    const all = groups.flatMap((g) => g.items);
    expect(all.some((i) => i.to === '/favorites' || i.to === '/cart')).toBe(false);
    expect(all.some((i) => i.to === '/messages' || i.to === '/notifications')).toBe(false);
  });

  it('misafir Ayarlar: yalnız dil, yardım ve bilgi/yasal; authOnly satırlar düşer', () => {
    const guest = selectSettingsSections(buildProfileMenuGroups(schemaT, base), { isGuest: true });
    expect(guest.map((g) => g.key)).toEqual(['preferences', 'support', 'info']);
    expect(guest[0]!.items.map((i) => i.key)).toEqual(['language']);
    expect(guest[1]!.items.map((i) => i.key)).toEqual(['help']);
  });

  it('tek üyelik satırı yalnız satın alma açıkken ya da ücretli üyede gelir (Apple 2.1(b))', () => {
    expect(items().some((i) => i.key === 'membership')).toBe(false);
    const paid = items({ showMembership: true });
    // Satırda katman rozeti yok (profil rozetleri kaldırıldı).
    expect(paid.find((i) => i.key === 'membership')?.rightBadge).toBeUndefined();
    expect(paid.find((i) => i.key === 'membership')?.to).toBe('/membership');
    // "Aboneliğim" Üyelik Planı ile birleşti — ayrı satır/rota yok.
    expect(paid.some((i) => i.key === 'subscription' || i.to === '/settings/subscription')).toBe(false);
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

  it('her satır ikon taşır (Profil ve Ayarlar aynı satır görünümü)', () => {
    const groups = buildProfileMenuGroups(schemaT, {
      showMembership: true,
      isBusiness: true,
      isBusinessTier: true,
    });
    for (const g of groups) for (const i of g.items) expect(i.icon).toBeTruthy();
  });

  it('web etiketleri: "Takip Ettiklerim" ve "Engellenen Kullanıcılar"', () => {
    const all = items();
    expect(all.find((i) => i.key === 'account-following')?.label).toBe('Takip Ettiklerim');
    expect(all.find((i) => i.key === 'blocked')?.label).toBe('Engellenen Kullanıcılar');
  });
});
