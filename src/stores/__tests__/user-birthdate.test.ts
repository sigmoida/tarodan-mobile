/**
 * Doğum tarihi sunucudan kullanıcıya taşınır.
 *
 * `mapApiUserToUser` kırk kadar alan haritalıyor, `birthDate`'i taşımıyordu.
 * Profil düzenleme ekranı (`useEditProfile.ts:54`) onu okuyor, yani alan HER
 * ZAMAN boş açılıyordu — ve form kaydedilince (satır 99) o boş değer geri
 * gönderiliyor, kayıtlı tarih sessizce siliniyordu.
 */
import { mapApiUserToUser } from '../authStore';

describe('mapApiUserToUser — birthDate', () => {
  it('sunucudan gelen doğum tarihini taşır', () => {
    expect(mapApiUserToUser({ id: 'u1', birthDate: '1990-01-15' } as any).birthDate)
      .toBe('1990-01-15');
  });

  it('alan null geldiğinde undefined bırakır — "1970-01-01" uydurmaz', () => {
    expect(mapApiUserToUser({ id: 'u1', birthDate: null } as any).birthDate).toBeUndefined();
  });

  it('alan hiç gelmediğinde de çökmez', () => {
    expect(mapApiUserToUser({ id: 'u1' } as any).birthDate).toBeUndefined();
  });
});
