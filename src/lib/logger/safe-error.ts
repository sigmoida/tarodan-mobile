/**
 * Release günlüğüne güvenle yazılabilen hata özeti.
 *
 * Ham `AxiosError` nesnesi `config.headers.Authorization` (Bearer token),
 * `config.data` ve `response.data` (kişisel veri / token) taşır; `console.error(err)`
 * bunların hepsini cihaz günlüğüne basar. `safeError` yalnız mesaj, HTTP durumu,
 * hata kodu, yöntem ve URL YOLU döndürür. Header, gövde ve sorgu dizesi
 * (`?token=...`) asla okunmaz.
 */
export interface SafeError {
  name?: string;
  message: string;
  status?: number;
  code?: string;
  method?: string;
  path?: string;
}

const MAX_MESSAGE = 200;

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" ? (v as Record<string, unknown>) : null;

const truncate = (s: string): string =>
  s.length > MAX_MESSAGE ? `${s.slice(0, MAX_MESSAGE)}…` : s;

/** `https://api.x.com/a/b?token=1#h` -> `/a/b`; uzun opak segmentler (token/uuid) maskelenir. */
export function safeUrlPath(url: unknown): string | undefined {
  if (typeof url !== "string" || !url) return undefined;
  const noOrigin = url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "");
  const path = noOrigin.split(/[?#]/)[0] || "/";
  return path
    .split("/")
    .map((seg) => (/^[A-Za-z0-9_-]{32,}$/.test(seg) ? ":redacted" : seg))
    .join("/");
}

export function safeError(err: unknown): SafeError {
  const e = asRecord(err);
  if (!e) return { message: err == null ? "Unknown error" : truncate(String(err)) };

  const out: SafeError = {
    message: typeof e.message === "string" && e.message ? truncate(e.message) : "Unknown error",
  };
  if (typeof e.name === "string" && e.name !== "Error") out.name = e.name;

  const response = asRecord(e.response);
  const status = response?.status ?? e.status;
  if (typeof status === "number") out.status = status;
  if (typeof e.code === "string") out.code = e.code;

  const config = asRecord(e.config);
  if (config) {
    if (typeof config.method === "string") out.method = config.method.toUpperCase();
    const path = safeUrlPath(config.url);
    if (path) out.path = path;
  }
  return out;
}
