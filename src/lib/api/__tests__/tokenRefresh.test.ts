/**
 * C1 (düzeltme turu) — sessiz token yenilemesi zustand store'u güncellemiyordu.
 *
 * `performTokenRefresh` yeni access token'ı YALNIZ SecureStore'a yazıyordu.
 * Axios etkilenmiyor (request interceptor'ı token'ı SecureStore'dan okur), ama
 * store'dan okuyan tüketiciler ilk yenilemeden sonra süresi DOLMUŞ token'la
 * kalıyordu:
 *   - `AppImage` (bearer'lı mesaj eki görselleri) → 401 → kalıcı placeholder,
 *   - `useMessagingSocket` (socket bağlantı token'ı) → bu commit'ten önce de
 *     var olan bayat-token hatası.
 *
 * Bu suite refresh yolunun SÖZLEŞMESİNİ kilitler: iki yanıt şekli, rotated
 * refresh token'ın kaydı, store senkronu, logout yarışında zombi oturum
 * yazmama, ve refresh başarısızlığında logout → login yönlendirme sırası.
 *
 * Mock deseni: `@/lib/api-client` sahte bir axios instance döndürür ve
 * `client.ts`'in kaydettiği response-error handler'ı yakalar; böylece gerçek
 * bir 401 akışını ağ olmadan sürebiliyoruz. `singleFlight` KASITLI olarak
 * gerçeği (requireActual) — bu tur onun semantiğini değiştirmiyor.
 */
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

jest.mock("@/lib/api-client", () => {
  const actual = jest.requireActual("@/lib/api-client");
  const responseErrorHandlers: any[] = [];
  const makeClient = () => {
    // Instance hem çağrılabilir (retry: `return api(originalRequest)`) hem de
    // interceptor kaydı kabul eden bir obje olmalı.
    const client: any = jest.fn(() => Promise.resolve({ data: { retried: true } }));
    client.interceptors = {
      request: { use: jest.fn() },
      response: {
        use: jest.fn((_onOk: any, onErr: any) => {
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
  return {
    useAuthStore: create(() => ({ token: null, logout: jest.fn() })),
  };
});

import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { axios } from "@/lib/api-client";
import { useAuthStore } from "@/stores/authStore";
import "../client";

const mockPost = axios.post as unknown as jest.Mock;
const mockSetItem = SecureStore.setItemAsync as unknown as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as unknown as jest.Mock;

const onResponseError = (jest.requireMock("@/lib/api-client") as any)
  .__responseErrorHandlers[0] as (error: any) => Promise<any>;

/** client.ts'in gördüğü şekliyle bir 401 axios hatası. */
const error401 = () => ({
  config: { headers: {} as Record<string, string> },
  response: { status: 401 },
});

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ token: "expired-token", logout: jest.fn() });
  mockGetItem.mockImplementation(async (key: string) =>
    key === "refreshToken" ? "refresh-1" : "expired-token",
  );
});

describe("silent token refresh — zustand store senkronu (C1)", () => {
  it("`data.tokens.accessToken` şeklinde: SecureStore + store birlikte yenilenir", async () => {
    mockPost.mockResolvedValueOnce({
      data: { tokens: { accessToken: "fresh-1", refreshToken: "rotated-1" } },
    });

    await onResponseError(error401());

    expect(mockSetItem).toHaveBeenCalledWith("accessToken", "fresh-1");
    // Rotated refresh token'ın kaydı korunuyor (asıl refresh bug'ının regresyonu).
    expect(mockSetItem).toHaveBeenCalledWith("refreshToken", "rotated-1");
    // ASIL DÜZELTME: store artık bayat token'ı taşımıyor.
    expect(useAuthStore.getState().token).toBe("fresh-1");
  });

  it("düz `data.accessToken` şekli de store'u senkronlar (iki şekil de korunur)", async () => {
    mockPost.mockResolvedValueOnce({ data: { accessToken: "fresh-2" } });

    await onResponseError(error401());

    expect(mockSetItem).toHaveBeenCalledWith("accessToken", "fresh-2");
    expect(useAuthStore.getState().token).toBe("fresh-2");
  });

  it("yenilenen token retry isteğinin Authorization header'ına da yazılır", async () => {
    mockPost.mockResolvedValueOnce({ data: { accessToken: "fresh-3" } });
    const err = error401();

    await onResponseError(err);

    expect(err.config.headers.Authorization).toBe("Bearer fresh-3");
  });

  it("refresh uçuştayken çıkış yapıldıysa store'a zombi oturum yazılmaz", async () => {
    // logout store token'ını null'lar; refresh sonrası onu geri diriltmemeliyiz.
    useAuthStore.setState({ token: null });
    mockPost.mockResolvedValueOnce({ data: { accessToken: "fresh-4" } });

    await onResponseError(error401());

    expect(useAuthStore.getState().token).toBeNull();
    // SecureStore yazımı (mevcut davranış) değişmedi.
    expect(mockSetItem).toHaveBeenCalledWith("accessToken", "fresh-4");
  });

  it("refresh token yoksa store'a dokunulmaz; logout → login yönlendirmesi çalışır", async () => {
    mockGetItem.mockImplementation(async () => null);
    const logout = jest.fn();
    useAuthStore.setState({ token: "expired-token", logout });

    await onResponseError(error401()).catch(() => undefined);

    expect(mockPost).not.toHaveBeenCalled();
    expect(logout).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/(auth)/login");
    // store token'ını logout temizler — refresh yolu kendi başına yazmaz.
    expect(useAuthStore.getState().token).toBe("expired-token");
  });
});
