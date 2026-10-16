import { resolveApiBaseUrl } from './baseUrl';

/**
 * Mesaj eki URL'i — API'nin JWT isteyen TEK görsel ucu.
 *
 * Sunucu (`MediaService.buildMessageAttachmentUrl`) mesaj gövdesine
 * `<API_URL>/api/media/message-attachment/<mediaFileId>` gömüyor; uç JWT ister ve
 * presigned S3 URL'ine 302 ile yönlendirir. Mesaj gövdesi ise GÜVENİLMEZ girdi:
 * karşı taraf elle `[IMG:https://saldirgan.example/x]` yazabilir. Bu yüzden
 * `Authorization: Bearer` header'ı (AppImage) ve `[IMG:…]` işaretinin mutlak URL
 * hedefi (contentFilter) YALNIZ bu desene izin verir:
 *   - şema + host(+port) API base URL'iyle BİREBİR aynı (userinfo `@` yok),
 *   - yol tam olarak `<api base yolu>/media/message-attachment/<id>`,
 *   - id yalnız `[A-Za-z0-9_-]` (yüzde kodlama / `..` / ek segment yok),
 *   - sorgu ve parça (`?`, `#`) yok.
 */
const ABSOLUTE_URL_RE = /^(https?):\/\/([^/?#\\@\s]+)(\/[^?#\s]*)?$/i;
const ATTACHMENT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const ATTACHMENT_SEGMENT = '/media/message-attachment/';

type ParsedUrl = { origin: string; path: string };

function parseAbsolute(url: string): ParsedUrl | null {
  const m = ABSOLUTE_URL_RE.exec(url);
  if (!m) return null;
  return { origin: `${m[1]!.toLowerCase()}://${m[2]!.toLowerCase()}`, path: m[3] ?? '' };
}

export function isApiMessageAttachmentUrl(url: unknown, apiBaseUrl: string = resolveApiBaseUrl()): boolean {
  if (typeof url !== 'string') return false;
  const target = parseAbsolute(url.trim());
  const base = parseAbsolute(apiBaseUrl.replace(/\/+$/, ''));
  if (!target || !base || target.origin !== base.origin) return false;
  const prefix = `${base.path}${ATTACHMENT_SEGMENT}`;
  if (!target.path.startsWith(prefix)) return false;
  return ATTACHMENT_ID_RE.test(target.path.slice(prefix.length));
}
