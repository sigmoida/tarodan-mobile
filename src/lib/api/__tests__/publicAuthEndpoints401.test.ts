/**
 * Giriş uçlarının 401'i "oturum bitti" DEĞİLDİR.
 *
 * Canlıda ölçülen hata (31 Ağu 2026): production API'si Apple token'ını
 * `jwt audience invalid. expected: com.tarodan.web` ile reddedip 401 döndü.
 * Response interceptor bunu oturum sonu sanıp tam sessiz-çıkış makinesini
 * çalıştırdı: refresh denemesi → `authStore.logout()` → `router.replace(login)`.
 * `logout()` içindeki `unregisterPushNotifications()` gerçek cihazda
 * `getExpoPushTokenAsync` üzerinde asılı kaldığı için interceptor HİÇ reject
 * etmedi; `useLogin.handleApple`'ın `catch`/`finally` blokları çalışmadı ve
 * buton sonsuza kadar "Giriş yapılıyor..." durumunda kaldı — kullanıcı hiçbir
 * hata görmedi.
 *
 * Kök düzeltme: kimlik SUNAN uçlarda (login/register/google/apple/refresh/
 * logout/check-email/resend-verification) 401 doğrudan çağırana geri verilir.
 * Oturumu olmayan bir kullanıcıyı "çıkış yaptırmanın" anlamı yok.
 */
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

jest.mock("@/lib/api-client", () => {
  const actual = jest.requireActual("@/lib/api-client");
  const responseErrorHandlers: any[] = [];
  const makeClient = () => {
    const client: any = jest.fn(() => Promise.resolve({ data: { retried: true } }));
    client.interceptors = {
      request: { use: jest.fn() },
      response: {
        use: jest.fn((_ok: any, onErr: any) => {
          if (onErr) responseErrorHandlers.push(onErr);
        }),
      },
    };
    return client;
  };
  return {
    axios: { post: jest.fn() },
    createApiClient: jest.fn(() => makeClient()),
    singleFlight: actual.singleFlight,
    __responseErrorHandlers: responseErrorHandlers,
  };
});

jest.mock("@/stores/authStore", () => {
  const { create } = require("zustand");
  return { useAuthStore: create(() => ({ token: null, logout: jest.fn() })) };
});

import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { axios } from "@/lib/api-client";
import { useAuthStore } from "@/stores/authStore";
import "../client";

const mockPost = axios.post as unknown as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as unknown as jest.Mock;
const onResponseError = (jest.requireMock("@/lib/api-client") as any)
  .__responseErrorHandlers[0] as (error: any) => Promise<any>;

const error401 = (url: string) => ({
  config: { url, headers: {} as Record<string, string> },
  response: { status: 401 },
});

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ token: null, logout: jest.fn() });
  // Bayat bir refresh token DURUYOR: düzeltme öncesi interceptor bunu görüp
  // refresh denemesine girerdi. Testin ayırt ediciliği buna dayanıyor.
  mockGetItem.mockImplementation(async (key: string) =>
    key === "refreshToken" ? "stale-refresh" : null,
  );
});

describe("kimlik sunan uçlarda 401 — sessiz çıkış TETİKLENMEZ", () => {
  const publicPaths = [
    "/auth/login",
    "/auth/apple",
    "/auth/google",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
    "/auth/check-email",
    "/auth/resend-verification",
  ];

  it.each(publicPaths)("%s: hata olduğu gibi çağırana döner", async (path) => {
    const err = error401(path);

    await expect(onResponseError(err)).rejects.toBe(err);

    expect(mockPost).not.toHaveBeenCalled();                    // refresh denenmedi
    expect(useAuthStore.getState().logout).not.toHaveBeenCalled(); // çıkış yok
    expect(router.replace).not.toHaveBeenCalled();               // yönlendirme yok
  });

  it("korumalı uçlarda davranış AYNEN korunur: 401 → refresh denenir", async () => {
    mockPost.mockResolvedValueOnce({ data: { accessToken: "fresh" } });

    await onResponseError(error401("/users/me"));

    expect(mockPost).toHaveBeenCalled();
  });
});
