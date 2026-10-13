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

  it('isAdFree null/eksik ise false yazılır (reklam gösterilir; tabloya düşülmez)', () => {
    expect(mapServerLimits({ isAdFree: null })!.isAdFree).toBe(false);
    expect(mapServerLimits({ canTrade: true })!.isAdFree).toBe(false);
    expect(mapServerLimits({ isAdFree: 'yes' as any })!.isAdFree).toBe(false);
  });

  it('boolean isAdFree sunucu kararıdır (true da false da)', () => {
    expect(mapServerLimits({ isAdFree: true })!.isAdFree).toBe(true);
    expect(mapServerLimits({ isAdFree: false })!.isAdFree).toBe(false);
  });
});

describe('isAdFree — authStore bindirmesi', () => {
  const { useAuthStore } = require('@/stores/authStore');

  const setTier = (tier: string) =>
    useAuthStore.setState({ user: { membershipTier: tier } as any, serverLimits: null });

  it('premium üye + sunucu null → serverLimits.isAdFree false (sessizce reklamsız KALMAZ)', () => {
    setTier('premium');
    useAuthStore.getState().setServerLimits(mapServerLimits({ isAdFree: null })!);
    expect(useAuthStore.getState().serverLimits?.isAdFree).toBe(false);
  });

  it('sunucu isAdFree:true derse ücretsiz üye de reklamsız olur', () => {
    setTier('free');
    useAuthStore.getState().setServerLimits(mapServerLimits({ isAdFree: true })!);
    expect(useAuthStore.getState().serverLimits?.isAdFree).toBe(true);
  });
});
