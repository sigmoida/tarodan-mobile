/**
 * `Accept-Language` HER axios instance'ına takılır.
 *
 * Sunucu (#224) hata mesajını isteğin `accept-language` başlığına göre
 * çeviriyor; başlık yoksa tr'ye düşüyor (staging 2026-08-26 ölçümü, bkz.
 * `docs/superpowers/reports/2026-08-26-delta-19-olcum.md`).
 *
 * Bu test tek bir instance'ı değil **hepsini** tarıyor: hata gösteren misafir
 * yolları (`guestApi` — checkout, sipariş takibi, iletişim) unutulmaya en açık
 * olanlar ve unutulduğunda belirti sessiz: uygulama İngilizce, hata Türkçe.
 * `cookieAuth.test.ts` aynı gerekçeyle aynı topluca-tarama desenini kullanıyor.
 */
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

jest.mock("@/lib/api-client", () => {
  const actual = jest.requireActual("@/lib/api-client");
  const clients: any[] = [];
  const makeClient = () => {
    const client: any = jest.fn(() => Promise.resolve({ data: {} }));
    client.requestInterceptors = [] as any[];
    client.interceptors = {
      request: {
        use: jest.fn((onFulfilled: any) => {
          client.requestInterceptors.push(onFulfilled);
        }),
      },
      response: { use: jest.fn() },
    };
    clients.push(client);
    return client;
  };
  return {
    axios: { post: jest.fn(() => Promise.resolve({ data: {} })) },
    createApiClient: jest.fn(() => makeClient()),
    singleFlight: actual.singleFlight,
    __clients: clients,
  };
});

jest.mock("@/stores/authStore", () => {
  const { create } = require("zustand");
  return {
    useAuthStore: create(() => ({ token: null, logout: jest.fn() })),
  };
});

import "../client";

const clients = (jest.requireMock("@/lib/api-client") as any).__clients as any[];
const i18n = require("@/i18n/config").default;

/** İstemcinin interceptor'larını boş bir config üzerinde sırayla koştur. */
async function runRequestInterceptors(client: any) {
  let config: any = { headers: {} };
  for (const fn of client.requestInterceptors) {
    config = (await fn(config)) ?? config;
  }
  return config;
}

describe("Accept-Language interceptor'ı", () => {
  afterEach(async () => {
    await i18n.changeLanguage("tr");
  });

  it("iki instance da oluşturulmuş (api + guestApi)", () => {
    expect(clients.length).toBeGreaterThanOrEqual(2);
  });

  it("HER instance başlığı yazıyor", async () => {
    for (const client of clients) {
      const config = await runRequestInterceptors(client);
      expect(config.headers["Accept-Language"]).toBe("tr");
    }
  });

  it("dil değişince gönderilen değer de değişir", async () => {
    await i18n.changeLanguage("en");
    for (const client of clients) {
      const config = await runRequestInterceptors(client);
      expect(config.headers["Accept-Language"]).toBe("en");
    }
  });
});
