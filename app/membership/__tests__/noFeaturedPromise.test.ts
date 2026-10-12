/**
 * Sunucu `featuredListingSlots`'u kapattı (777492912): üyelik ekranları
 * "{n} öne çıkan ilan" vaat etmemeli.
 */
import fs from 'fs';
import path from 'path';
import { buildMembershipTiers } from '../checkout/_lib/tiers';

describe('üyelik ekranları öne çıkan ilan vaat etmez', () => {
  it('checkout kademe listesinde öne çıkan ilan satırı yok', () => {
    const t = ((key: string) => key) as any;
    const tiers = buildMembershipTiers(t);
    for (const tier of Object.values(tiers)) {
      expect(tier.features.some((f: string) => /featured/i.test(f))).toBe(false);
    }
  });

  it('satın alma sonrası ekran da anahtarı kullanmaz', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'success.tsx'), 'utf8');
    expect(src).not.toMatch(/tierFeatureFeaturedListings/);
  });
});
