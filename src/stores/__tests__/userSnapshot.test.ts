/**
 * Açılış kullanıcı görüntüsü (SecureStore): küçük kalır (2048 bayt sınırı), uzun / nadir
 * PII alanlarını taşımaz, bozuk kayıt açılışı bozmaz.
 */
import type { User } from '../authStore';
import { parseUserSnapshot, serializeUserSnapshot } from '../userSnapshot';

const user = (over: Partial<User> = {}): User => ({
  id: 'u1',
  email: 'a@test.com',
  displayName: 'Ayşe',
  membershipTier: 'free',
  isVerified: false,
  isEmailVerified: true,
  isPhoneVerified: false,
  verificationStatus: 'unverified',
  isSeller: false,
  totalSales: 0,
  totalPurchases: 0,
  accountAge: 1,
  profileCompletion: 40,
  disputeCount: 0,
  listingCount: 0,
  maxFreeListings: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const bytes = (s: string) => new TextEncoder().encode(s).length;

describe('serializeUserSnapshot', () => {
  it('uzun / nadir alanları (bio, telefon, doğum tarihi, sosyal) taşımaz', () => {
    const json = serializeUserSnapshot(
      user({
        bio: 'uzun bio',
        phone: '+905551112233',
        birthDate: '1990-01-01',
        instagramHandle: 'x',
        taxOffice: 'Kadıköy',
      }),
    )!;
    const parsed = JSON.parse(json);
    expect(parsed).toMatchObject({ id: 'u1', email: 'a@test.com', membershipTier: 'free' });
    for (const k of ['bio', 'phone', 'birthDate', 'instagramHandle', 'taxOffice']) {
      expect(parsed).not.toHaveProperty(k);
    }
  });

  it('sınırı aşan presigned avatar URL’leri düşer, kimlik kalır', () => {
    const longUrl = `https://s3.example.com/a.jpg?${'X'.repeat(1500)}`;
    const json = serializeUserSnapshot(user({ avatar: longUrl, avatarUrl: longUrl }))!;
    expect(bytes(json)).toBeLessThanOrEqual(2048);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe('u1');
    expect(parsed).not.toHaveProperty('avatarUrl');
  });

  it('kısa avatar korunur', () => {
    const parsed = JSON.parse(serializeUserSnapshot(user({ avatarUrl: 'https://cdn/x.jpg' }))!);
    expect(parsed.avatarUrl).toBe('https://cdn/x.jpg');
  });
});

describe('parseUserSnapshot', () => {
  it('bozuk / kimliksiz kayıt null', () => {
    expect(parseUserSnapshot(null)).toBeNull();
    expect(parseUserSnapshot('{bozuk')).toBeNull();
    expect(parseUserSnapshot('"token-string"')).toBeNull();
    expect(parseUserSnapshot(JSON.stringify({ email: 'a@test.com' }))).toBeNull();
  });

  it('geçerli kayıt geri okunur', () => {
    expect(parseUserSnapshot(serializeUserSnapshot(user()))?.id).toBe('u1');
  });
});
