import { mapServerLimits } from '../useMembershipLimits';

describe('mapServerLimits', () => {
  it('API alan adlarını yerel isimlere çevirir', () => {
    const mapped = mapServerLimits({
      maxTotalListings: 200,
      maxImages: 10,
      canCreateCollection: true,
      canTrade: true,
      isAdFree: true,
    });
    expect(mapped).toEqual({
      maxListings: 200,
      maxImagesPerListing: 10,
      canCreateCollections: true,
      canTrade: true,
      isAdFree: true,
    });
  });

  it('null girdide null döner (sunucuya ulaşılamadı)', () => {
    expect(mapServerLimits(null)).toBeNull();
  });

  it('sunucunun vermediği alan için ANAHTAR HİÇ KONMAZ', () => {
    // Kritik: bindirme `{ ...TIER_LIMITS[tier], ...override }` şeklinde.
    // Anahtar `undefined` değeriyle konsaydı TIER_LIMITS değerini EZERDİ.
    const mapped = mapServerLimits({ canTrade: false })!;
    expect(mapped.canTrade).toBe(false);
    expect('maxListings' in mapped).toBe(false);
    expect('maxImagesPerListing' in mapped).toBe(false);
  });

  it('false ve 0 değerleri korunur (falsy tuzağı)', () => {
    const mapped = mapServerLimits({ canTrade: false, isAdFree: false, maxTotalListings: 0 })!;
    expect(mapped.canTrade).toBe(false);
    expect(mapped.isAdFree).toBe(false);
    expect(mapped.maxListings).toBe(0);
  });

  it('isAdFree null/eksik ise anahtar HİÇ konmaz (sabit tier tablosu geçerli kalır)', () => {
    expect('isAdFree' in mapServerLimits({ isAdFree: null })!).toBe(false);
    expect('isAdFree' in mapServerLimits({ canTrade: true })!).toBe(false);
    expect('isAdFree' in mapServerLimits({ isAdFree: 'yes' as any })!).toBe(false);
  });

  it('boolean isAdFree sunucu kararıdır ve tabloyu ezer (true da false da)', () => {
    expect(mapServerLimits({ isAdFree: true })).toEqual({ isAdFree: true });
    expect(mapServerLimits({ isAdFree: false })).toEqual({ isAdFree: false });
  });
});

describe('isAdFree — authStore bindirmesi', () => {
  // Gerçek store: sunucu boolean verirse tabloyu ezer, vermezse tablo kalır.
  const { useAuthStore } = require('@/stores/authStore');

  const setTier = (tier: string) =>
    useAuthStore.setState({ user: { membershipTier: tier } as any, serverLimits: null });

  it('sunucu söylemezse premium tablosu (reklamsız) geçerli', () => {
    setTier('premium');
    useAuthStore.getState().setServerLimits(mapServerLimits({ isAdFree: null })!);
    expect(useAuthStore.getState().limits?.isAdFree).toBe(true);
  });

  it('sunucu isAdFree:false derse premium bile reklam görür', () => {
    setTier('premium');
    useAuthStore.getState().setServerLimits(mapServerLimits({ isAdFree: false })!);
    expect(useAuthStore.getState().limits?.isAdFree).toBe(false);
  });

  it('sunucu isAdFree:true derse ücretsiz üye reklamsız olur', () => {
    setTier('free');
    useAuthStore.getState().setServerLimits(mapServerLimits({ isAdFree: true })!);
    expect(useAuthStore.getState().limits?.isAdFree).toBe(true);
  });
});
