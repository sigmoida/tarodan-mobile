/**
 * 2FA KOD uçları (`verify` / `disable` / `backup-codes`) ve "yanlış kod" hatası.
 *
 * Eski sunucu yanlış TOTP kodunu `401 { i18nKey: 'server.security.invalidCode' }` ile
 * reddediyordu; yeni sözleşme `400 { i18nKey: 'server.security.invalidCode',
 * errorCode: 'INVALID_2FA_CODE' }`. 401 hâli response interceptor'ında "oturum bitti" sanılıp
 * refresh + yeniden deneme (her basışta iki istek, throttle payı iki kat) ve refresh düşerse
 * SESSİZ ÇIKIŞ tetikliyordu; kullanıcı yalnız geçici bir toast görüyordu (ya da login'e
 * atılıyordu). Bu uçlarda 401 asla çıkış yaptırmaz; yanlış kod doğrudan çağırana döner ve
 * ekran onu kod alanının altında gösterir.
 */
export const TWO_FACTOR_CODE_PATHS = [
  "/security/2fa/verify",
  "/security/2fa/disable",
  "/security/2fa/backup-codes",
] as const;

export const INVALID_2FA_CODE_ERROR = "INVALID_2FA_CODE";
export const INVALID_2FA_CODE_KEY = "server.security.invalidCode";

export function isTwoFactorCodeRequest(config?: { url?: string }): boolean {
  const url = config?.url ?? "";
  return TWO_FACTOR_CODE_PATHS.some((path) => url.includes(path));
}

type LooseError = {
  response?: { data?: { errorCode?: unknown; i18nKey?: unknown } };
};

/** Sunucu "kod yanlış" dedi mi (eski 401 ya da yeni 400 gövdesi)? */
export function isInvalidTwoFactorCode(error: unknown): boolean {
  const data = (error as LooseError | null | undefined)?.response?.data;
  return (
    data?.errorCode === INVALID_2FA_CODE_ERROR ||
    data?.i18nKey === INVALID_2FA_CODE_KEY
  );
}
