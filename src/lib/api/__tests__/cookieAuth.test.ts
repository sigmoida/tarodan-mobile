/**
 * Mobil istemci ÇEREZ TAŞIMAZ — bearer'la kimliklenir.
 *
 * Sunucu `POST /auth/login` ve `POST /auth/refresh` yanıtlarında üç çerez
 * bırakıyor: `access_token`, `refresh_token`, `csrf_token` (2026-08-10 canlı
 * ölçümü, staging). Bunlar **web'in** cookie-auth akışı içindir.
 *
 * React Native'in ağ katmanı (iOS'ta NSURLSession) paylaşılan bir çerez deposu
 * tutar ve `withCredentials` kapatılmadıkça bu çerezleri sonraki her isteğe
 * kendiliğinden ekler. Sunucunun CSRF muhafızı **auth çerezi varsa** devreye
 * girip `X-CSRF-Token` başlığı beklediği için, çerez sızdığı anda değiştirici
 * her istek `403 {"message":"Invalid CSRF token"}` alır.
 *
 * Gözlenen belirti: giriş anında her şey çalışır; access token'ın 900 sn'lik
 * ömrü dolup istemci sessizce `/auth/refresh` çağırdıktan SONRA checkout 403'e
 * düşer. Yani hata oturumun ortasında, ilk 15 dakikadan sonra ortaya çıkar —
 * bu yüzden hem gözden kaçması hem de "bazen oluyor" diye raporlanması kolaydır.
 *
 * `withCredentials: false` KASITLI olarak burada, mobil çağrı yerlerinde
 * duruyor — paylaşılan `createApiClient` fabrikasında DEĞİL: web aynı fabrikayı
 * kullanıyor ve onun cookie-auth'a ihtiyacı var.
 */
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

jest.mock("@/lib/api-client", () => {
  const actual = jest.requireActual("@/lib/api-client");
  const configs: any[] = [];
  const makeClient = () => {
    const client: any = jest.fn(() => Promise.resolve({ data: {} }));
    client.interceptors = {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    };
    return client;
  };
  return {
    axios: { post: jest.fn(() => Promise.resolve({ data: {} })) },
    createApiClient: jest.fn((config: any) => {
      configs.push(config);
      return makeClient();
    }),
    singleFlight: actual.singleFlight,
    __clientConfigs: configs,
  };
});

jest.mock("@/stores/authStore", () => {
  const { create } = require("zustand");
  return {
    useAuthStore: create(() => ({ token: null, logout: jest.fn() })),
  };
});

import "../client";

const configs = (jest.requireMock("@/lib/api-client") as any)
  .__clientConfigs as any[];

describe("mobil axios istemcileri çerez taşımaz", () => {
  it("iki instance da oluşturulmuş (api + guestApi)", () => {
    expect(configs.length).toBeGreaterThanOrEqual(2);
  });

  it("HER instance withCredentials: false ile kuruluyor", () => {
    // Tek tek değil topluca: ileride üçüncü bir instance eklenirse o da
    // kapsanır — çerez sızıntısı tek bir unutulmuş instance'tan olur.
    for (const config of configs) {
      expect(config.withCredentials).toBe(false);
    }
  });

  it("`undefined` bırakmak YETMEZ — RN'in varsayılanı çerez göndermektir", () => {
    // Bu, kuralın neden `toBe(false)` olduğunu kilitler: axios yalnızca alan
    // açıkça verildiğinde `xhr.withCredentials`'ı yazar, aksi halde RN'in
    // çerez gönderen varsayılanı yürürlükte kalır.
    for (const config of configs) {
      expect(config.withCredentials).not.toBeUndefined();
    }
  });
});
