/**
 * `Accept-Language` — sunucu hata mesajlarının dili.
 *
 * Staging'de ölçüldü (2026-08-26): aynı hatalı login `accept-language: tr` ile
 * "Email veya şifre hatalı", `accept-language: en` ile "Invalid email or
 * password" dönüyor. Başlık gönderilmezse sunucu tr'ye düşüyor — mobil hiç
 * göndermiyordu, yani İngilizce kullanan Türkçe hata görüyordu.
 *
 * Bu testler değeri i18next'ten okuyan çözücüyü çiviliyor; interceptor'ın iki
 * instance'a da takıldığı `client.ts`'te tek yerden yapılıyor.
 */
import { currentLocale, acceptLanguageHeader } from '../acceptLanguage';

const i18n = require('@/i18n/config').default;

describe('currentLocale', () => {
  afterEach(async () => {
    await i18n.changeLanguage('tr');
  });

  it('seçili dili döndürür', async () => {
    await i18n.changeLanguage('en');
    expect(currentLocale()).toBe('en');
  });

  it('dil değişince yeni değeri döndürür — kopya tutmaz', async () => {
    await i18n.changeLanguage('en');
    expect(currentLocale()).toBe('en');
    await i18n.changeLanguage('tr');
    expect(currentLocale()).toBe('tr');
  });

  it('desteklenmeyen dilde varsayılana düşer', async () => {
    await i18n.changeLanguage('de');
    expect(currentLocale()).toBe('tr');
  });
});

describe('acceptLanguageHeader', () => {
  it('sunucunun beklediği sade etiketi üretir (bölge eki yok)', async () => {
    await i18n.changeLanguage('en');
    expect(acceptLanguageHeader()).toBe('en');
    await i18n.changeLanguage('tr');
    expect(acceptLanguageHeader()).toBe('tr');
  });
});
