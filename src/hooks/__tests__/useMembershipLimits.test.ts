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
});
