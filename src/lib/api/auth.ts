import { api, guestApi } from './client';
import { apiPath } from './path';
import type { ConsentDocumentKey } from '@/lib/shared/legalConsent';
import type {
  AppleLinkRequest,
  GoogleLinkRequest,
  ReauthRequest,
  ReauthResponse,
  SetPasswordRequest,
  SignInMethods,
  SignInProvider,
  UnlinkProviderRequest,
} from '@/types/sign-in-methods';

// Auth API - Web ile aynı endpoint'ler
export const authApi = {
  /** E-posta kayıtlı mı / şifresi var mı — backend: POST /auth/check-email (public) */
  checkEmail: (email: string) =>
    guestApi.post<{ exists: boolean; hasPassword: boolean }>('/auth/check-email', { email }),
  /**
   * Başarılı parola sonrası 2FA etkinse yanıt **200 + { requires2FA: true }** olur
   * (token YOK). Aynı istek `twoFactorCode` ile tekrarlanmalıdır.
   */
  login: (email: string, password: string, twoFactorCode?: string) =>
    api.post('/auth/login', {
      email,
      password,
      ...(twoFactorCode ? { twoFactorCode } : {}),
    }),
  loginWithGoogle: (idToken: string) =>
    api.post('/auth/google', { idToken }),
  /**
   * Apple ile giriş. `authorizationCode` sunucunun Apple refresh token'ı alıp
   * hesap silmede iptal edebilmesi içindir (Apple 5.1.1(v)). Sunucu alanı henüz
   * tanımıyor olabilir: global ValidationPipe `whitelist:true,
   * forbidNonWhitelisted:false` → bilinmeyen alan sessizce atılır, 400 dönmez.
   */
  loginWithApple: (credential: {
    identityToken: string;
    fullName?: string;
    authorizationCode?: string;
  }) =>
    api.post('/auth/apple', {
      identityToken: credential.identityToken,
      fullName: credential.fullName,
      ...(credential.authorizationCode ? { authorizationCode: credential.authorizationCode } : {}),
    }),
  register: (data: {
    username: string;
    displayName: string;
    email: string;
    password: string;
    phone?: string;
    birthDate?: string;
    acceptsMarketingEmails?: boolean;
    /** Kayıt formunda onaylanan zorunlu belgeler (terms, privacy, kvkk); sürüm sunucuda damgalanır. */
    acceptedConsents?: ConsentDocumentKey[];
  }) => api.post('/auth/register', data),
  /**
   * Kullanıcı adı uygunluğu — public, throttle **30/dk**. Yalnız "bu isim alınmış
   * mı" diye bakar, FORMAT doğrulaması YAPMAZ: örn. `Gorkem` (büyük harfli) için
   * bile `available:true` dönebilir. İstemci `USERNAME_PATTERN`'i (register
   * `_lib/schema.ts`) KENDİ zorlamalı ve bu uca yalnız o geçtikten sonra sormalı —
   * aksi halde kullanıcı "uygun" görüp kayıt anında 400 yer.
   */
  checkUsernameAvailability: (username: string) =>
    guestApi.get<{ available: boolean }>('/auth/username-availability', {
      params: { username },
    }),
  /**
   * İşletme ön başvurusu (`BusinessRegisterDto`) — HESAP OLUŞTURMAZ. Admin onayı
   * sonrası davet e-postasıyla kullanıcı adı/şifre `activateCorporateInvitation`
   * ile belirlenir. Canlıda doğrulandı (task-3-report.md): yalnız bu sekiz alan
   * kabul edilir; `password`/`companyName`/`taxId`/`city` YOK — göndermek 400
   * döndürür (beş zorunlu alan eksik sayılır). Web /auth/register/business ile eşleşir.
   *
   * ⚠️ `guestApi` (interceptor'sız istemci) ile gider: uç public'tir ve bayat token'lı
   * bir cihazda `api` ölümcül olurdu — 401 → refresh başarısızsa `handleAuthFailure()`
   * logout + login'e yönlendirir (başvuru sessizce kaybolur), refresh başarılıysa bu
   * non-idempotent POST **replay** edilir (mükerrer başvuru + 5/dk kotasından ikinci hak).
   */
  registerBusiness: (data: {
    authorizedFullName: string; // zorunlu, 2-120
    companyLegalName: string; // zorunlu, 2-240
    companyTitle: string; // zorunlu, 2-200
    companyAddress: string; // zorunlu, 10-500
    companyEmail: string; // zorunlu, e-posta
    kepAddress?: string; // opsiyonel, e-posta
    phone: string; // zorunlu: /^\+90[0-9]{10}$/
    contactPhone?: string; // opsiyonel, aynı format
  }) =>
    guestApi.post<{ applicationId: string; status: string; email: string; message: string }>(
      '/auth/register/business',
      data,
    ),
  /**
   * Çıkış — public uç. Sunucu refresh token'ı web'de çerezden, mobilde BODY'den okuyup DB'de
   * iptal eder (eskiden body boş gidiyordu: çıkıştan sonra refresh token süresi dolana dek
   * geçerli kalıyordu). `guestApi` ile gider: çağrı yerel temizlikten SONRA, token'lar silinmişken
   * yapılır; 401'i refresh / zorunlu çıkış tetiklememeli.
   */
  logout: (refreshToken?: string | null) =>
    guestApi.post('/auth/logout', refreshToken ? { refreshToken } : {}),
  getProfile: () => api.get('/users/me'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  // Geriye uyumluluk için eski ad korunur
  refreshToken: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  // Şifre sıfırlama / e-posta doğrulama akışı
  forgotPassword: (email: string) =>
    guestApi.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    guestApi.post('/auth/reset-password', { token, newPassword }),
  verifyEmail: (token: string) =>
    guestApi.post('/auth/verify-email', { token }),
  resendVerification: (email: string) => guestApi.post('/auth/resend-verification', { email }),
  /**
   * Kurumsal davet doğrulama (public, throttle 20/dk). Geçersiz/süresi dolmuş
   * davette **400** döner — bu durumda form gösterilmez.
   */
  getCorporateInvitation: (token: string) =>
    guestApi.get<{ companyTitle: string; companyEmail: string; expiresAt: string }>(
      '/auth/corporate-invitation',
      { params: { token } },
    ),
  /**
   * Kurumsal hesabın kullanıcı adı + ilk şifresini belirle (public, throttle 5/dk).
   * Kullanıcı adı BİR KEZ belirlenir, değiştirilemez.
   */
  activateCorporateInvitation: (data: {
    token: string;
    username: string;
    password: string;
  }) => guestApi.post('/auth/corporate-invitation/activate', data),
  /** Şifre değiştirme — backend `security` modülüne taşındı. */
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/security/password/change', { currentPassword, newPassword }),
  // ---- 2FA / Güvenlik (backend: /security/2fa/*) ----
  getTwoFactorStatus: () => api.get('/security/2fa/status'),
  /** 2FA'yı etkinleştir. Ölçüldü (staging, /security/2fa/enable):
   *  `secret`, `qrCodeUrl`, `qrCodeImage`, `backupCodes` — `qrCode` diye bir
   *  alan hiç yok. `qrCodeImage` çizilebilir base64 data URI. */
  setupTwoFactor: () =>
    api.post<{ secret: string; qrCodeUrl: string; qrCodeImage: string; backupCodes?: string[] }>(
      '/security/2fa/enable',
    ),
  // Backend Verify2FADto/Disable2FADto hepsi `code` alanı bekliyor (TOTP 6 hane).
  verifyTwoFactor: (code: string) =>
    api.post('/security/2fa/verify', { code }),
  disableTwoFactor: (code: string) =>
    api.post('/security/2fa/disable', { code }),
  regenerateBackupCodes: (code: string) =>
    api.post<{ backupCodes?: string[] } | string[]>('/security/2fa/backup-codes', { code }),
  /** Tüm cihazlardan çıkış — backend: DELETE /security/tokens */
  logoutAll: () => api.delete('/security/tokens'),
  /** SMS telefon doğrulama kodu gönder */
  sendPhoneCode: (phone: string) => api.post('/auth/phone/send-code', { phone }),
  /** SMS doğrulama kodunu doğrula */
  verifyPhone: (code: string) => api.post('/auth/phone/verify', { code }),
  /**
   * Send the e-mail change code to the NEW address (throttle 3/min). `reauthToken` is the
   * step-up token, sent in the body; without one the request passes only while the API
   * setting `auth_require_reauth_for_sensitive_actions` is off.
   */
  requestEmailChange: (newEmail: string, reauthToken?: string) =>
    api.post<{ message: string }>('/auth/email/request-change', {
      newEmail,
      ...(reauthToken ? { reauthToken } : {}),
    }),
  /** E-posta değişikliği kodunu doğrula (throttle 10/dk). */
  verifyEmailChange: (code: string) =>
    api.post<{ message: string; email: string }>('/auth/email/verify-change', { code }),
  // ---- Sign-in methods and step-up (contract delta 2026-10-21) ----
  /** The signed-in account's password flag and linked providers. */
  getSignInMethods: () => api.get<SignInMethods>('/auth/sign-in-methods'),
  /**
   * Step-up: one proof (the password, or a fresh provider sign-in for an account without
   * one) for a short-lived opaque token. Errors are never 401: `403 REAUTH_FAILED`,
   * `400 REAUTH_METHOD_NOT_ALLOWED`, `429 REAUTH_LOCKED`, `503 REAUTH_UNAVAILABLE`. The
   * token is kept in memory only (`useReauth`).
   */
  reauth: (proof: ReauthRequest) => api.post<ReauthResponse>('/auth/reauth', proof),
  /** First password for an account without one; answers the fresh `SignInMethods`. */
  setPassword: (body: SetPasswordRequest) =>
    api.post<SignInMethods>('/auth/password/set', body),
  /**
   * Connect Google (always behind the step-up). Native sends the `idToken` only, never `code`
   * too (both: 400). Answers the fresh `SignInMethods`; refusals: `409 PROVIDER_ALREADY_LINKED`,
   * `409 PROVIDER_LINKED_TO_OTHER_ACCOUNT`, `400 PROVIDER_TOKEN_INVALID`, `403 EMAIL_NOT_VERIFIED`.
   */
  linkGoogle: (body: Required<Pick<GoogleLinkRequest, 'idToken' | 'reauthToken'>>) =>
    api.post<SignInMethods>('/auth/social/google/link', {
      idToken: body.idToken,
      reauthToken: body.reauthToken,
    }),
  /**
   * Connect Apple (iOS only, ADR 0012; always behind the step-up). `authorizationCode` goes
   * with it, as on `POST /auth/apple`, so the API can revoke the Apple token on unlink and on
   * account deletion. Same refusals as `linkGoogle`.
   */
  linkApple: (body: AppleLinkRequest) =>
    api.post<SignInMethods>('/auth/social/apple/link', {
      identityToken: body.identityToken,
      ...(body.authorizationCode ? { authorizationCode: body.authorizationCode } : {}),
      reauthToken: body.reauthToken,
    }),
  /**
   * Disconnect a provider (always behind the step-up). A `POST`, because some proxies drop a
   * `DELETE` body. Refusals: `404 PROVIDER_NOT_LINKED`, `409 LAST_SIGN_IN_METHOD` (D1).
   */
  unlinkProvider: (provider: SignInProvider, body: UnlinkProviderRequest) =>
    api.post<SignInMethods>(apiPath`/auth/social/${provider}/unlink`, {
      reauthToken: body.reauthToken,
    }),
};
