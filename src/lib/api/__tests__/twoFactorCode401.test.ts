/**
 * 2FA kod uçlarında 401 ≠ oturum sonu.
 *
 * Kök neden (staging, "Doğrula ve Etkinleştir ilerlemiyor"): eski API yanlış TOTP kodunu
 * `401 { i18nKey: 'server.security.invalidCode' }` ile reddediyordu. Response interceptor bunu
 * "oturum bitti" sanıp refresh + yeniden deneme yapıyordu (her basışta İKİ verify isteği — throttle
 * 10/dk payı yarıya iniyor), refresh düşerse sessiz çıkış + login'e atma. Kullanıcı hatayı kod
 * alanında değil, geçici bir toast olarak görüyordu.
 *
 * Bu suite GERÇEK axios instance'ını (yalnız adapter sahte) client.ts'in interceptor zinciriyle
 * sürer: düzeltme öncesi "yanlış kod" testi iki istek + bir refresh üretiyordu.
 */
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));
jest.mock("@/stores/authStore", () => {
  const { create } = jest.requireActual<typeof import("zustand")>("zustand");
  return {
    useAuthStore: create(() => ({
      token: "a1",
      logout: jest.fn(async () => undefined),
    })),
  };
});

import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { axios } from "@/lib/api-client";
import { useAuthStore } from "@/stores/authStore";
import type { InternalAxiosRequestConfig } from "axios";
import { api } from "../client";

/** Testin yakaladığı hata biçimi (axios hatasının kullanılan kısmı). */
type CaughtError = {
  response: { status: number; data: Record<string, unknown> };
};
const caught = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("istek başarılı döndü");
    },
    (e: CaughtError) => e,
  );
const logoutMock = () =>
  (useAuthStore.getState() as unknown as { logout: jest.Mock }).logout;
const refreshPost = () => jest.spyOn(axios, "post");

type Reply = { status: number; data: unknown };
let replies: Reply[] = [];
const sent: { url?: string; auth?: string }[] = [];

beforeEach(() => {
  jest.restoreAllMocks();
  (router.replace as jest.Mock).mockClear();
  useAuthStore.setState({
    token: "a1",
    logout: jest.fn(async () => undefined),
  });
  sent.length = 0;
  replies = [];
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(
    async (k: string) => (k === "refreshToken" ? "r1" : "a1"),
  );
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    sent.push({
      url: config.url,
      auth: String(config.headers?.Authorization ?? ""),
    });
    const reply = replies.shift() ?? { status: 201, data: { success: true } };
    if (reply.status < 400)
      return {
        status: reply.status,
        data: reply.data,
        headers: {},
        config,
        statusText: "",
      };
    throw Object.assign(
      new Error(`Request failed with status code ${reply.status}`),
      {
        isAxiosError: true,
        config,
        response: {
          status: reply.status,
          data: reply.data,
          headers: {},
          config,
        },
      },
    );
  };
});

const invalidCode401 = {
  status: 401,
  data: {
    statusCode: 401,
    message: "Geçersiz doğrulama kodu",
    i18nKey: "server.security.invalidCode",
  },
};
const invalidCode400 = {
  status: 400,
  data: {
    statusCode: 400,
    message: "Geçersiz doğrulama kodu",
    i18nKey: "server.security.invalidCode",
    errorCode: "INVALID_2FA_CODE",
  },
};
const sessionExpired = {
  status: 401,
  data: {
    statusCode: 401,
    message: "Oturum gerekli",
    i18nKey: "server.auth.loginRequired",
  },
};

describe.each([
  "/security/2fa/verify",
  "/security/2fa/disable",
  "/security/2fa/backup-codes",
])("%s", (url) => {
  it("yanlış kod (eski 401): tek istek, refresh YOK, çıkış YOK, sunucu mesajı çağırana", async () => {
    const refresh = refreshPost();
    replies = [invalidCode401];

    const e = await caught(api.post(url, { code: "000000" }));

    expect(e.response.status).toBe(401);
    expect(e.response.data.message).toBe("Geçersiz doğrulama kodu");
    expect(sent).toHaveLength(1);
    expect(refresh).not.toHaveBeenCalled();
    expect(logoutMock()).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("yanlış kod (yeni 400 INVALID_2FA_CODE): olduğu gibi çağırana", async () => {
    const refresh = refreshPost();
    replies = [invalidCode400];

    const e = await caught(api.post(url, { code: "000000" }));

    expect(e.response.data.errorCode).toBe("INVALID_2FA_CODE");
    expect(sent).toHaveLength(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("bayat access token: bir kez yenilenip yeniden denenir", async () => {
    refreshPost().mockResolvedValueOnce({
      data: { accessToken: "a2", refreshToken: "r2" },
    });
    replies = [sessionExpired, { status: 201, data: { success: true } }];

    const res = await api.post(url, { code: "123456" });

    expect(res.data).toEqual({ success: true });
    expect(sent).toHaveLength(2);
  });

  it("refresh de düşerse: hata çağırana döner, sessiz çıkış YOK", async () => {
    refreshPost().mockRejectedValueOnce({ response: { status: 401 } });
    replies = [sessionExpired];

    const e = await caught(api.post(url, { code: "123456" }));

    expect(e.response.status).toBe(401);
    expect(logoutMock()).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

it("korumalı başka bir uçta davranış AYNEN: 401 → refresh düşerse çıkış + login", async () => {
  refreshPost().mockRejectedValueOnce({ response: { status: 401 } });
  replies = [sessionExpired];

  await api.get("/users/me").catch(() => undefined);

  expect(logoutMock()).toHaveBeenCalledWith({ reason: "forced" });
  expect(router.replace).toHaveBeenCalledWith("/(auth)/login");
});
