/**
 * Doğum tarihi sunucudan kullanıcıya taşınır.
 *
 * `mapApiUserToUser` kırk kadar alan haritalıyor, `birthDate`'i taşımıyordu.
 * Profil düzenleme ekranı (`useEditProfile.ts:54`) onu okuyor, yani alan HER
 * ZAMAN boş açılıyordu — kullanıcı kayıtlı bir tarih olsa bile onu hiç
 * göremiyordu.
 *
 * Düzeltme: bu değil, "form o boş değeri PATCH'le geri gönderip kayıtlı
 * tarihi siliyordu" iddiası doğrulanmadan yazılmış ve yanlıştı.
 * `useEditProfile.ts:107-109` boş string'i PATCH'ten ÖNCE `undefined`'a
 * çeviriyor, axios `client.ts`'de `transformRequest` yok, yani undefined
 * alan hiç gönderilmiyor. Sunucudaki kayıtlı tarih hiçbir zaman silinmedi —
 * yalnızca ekranda hiç gösterilmedi.
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
