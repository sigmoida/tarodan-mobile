/**
 * Mesajlarda yasaklı içerik tespiti — doğrudan iletişim bilgisi paylaşımını engeller.
 * Web paritesi: banka hesabı, telefon, e-posta, WhatsApp, Instagram, Telegram.
 *
 * Amaç: Platform dışı iletişimi önleyerek alıcı/satıcı koruması.
 *
 * ⚠️ React DIŞI modül — `useTranslation` çağıramaz; kullanıcıya gösterilen
 * `label`/mesaj metinleri global `i18n`'den ÇAĞRI ANINDA okunur (bkz.
 * `paytrDirectForm.ts`). REGEX'LER DAVRANIŞTIR, dile göre değişmez — yalnız
 * `labelKey` altındaki gösterim metni çevrilir.
 */
import i18n from '@/i18n/config';
import type { MessageKey } from '@/i18n/lib/generated/keys';

export type ContentViolationType =
  | 'phone'
  | 'email'
  | 'iban'
  | 'whatsapp'
  | 'telegram'
  | 'instagram'
  | 'external_link';

export interface ContentViolation {
  type: ContentViolationType;
  match: string;
  label: string;
}

/**
 * `labelKey`, `message.violationLabel*` katalog anahtarının son parçası —
 * gösterim metni `detectViolations` içinde ÇAĞRI ANINDA çözülür (PATTERNS
 * modül seviyesinde kurulsa da hiçbir metin burada donmaz, çünkü `label`
 * kendisi burada değil `i18n.t` çağrısında üretilir).
 */
const PATTERNS: Array<{ type: ContentViolationType; regex: RegExp; labelKey: MessageKey }> = [
  // Türkiye telefon: 05XX XXX XX XX, +90 5XX..., 0090 5XX...
  {
    type: 'phone',
    regex: /(?:\+?90[\s.-]?|0)?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g,
    labelKey: 'message.violationLabelPhone',
  },
  // Sabit hat + alan kodu ile bir dizi rakam
  {
    type: 'phone',
    regex: /\b0[2-4]\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
    labelKey: 'message.violationLabelPhone',
  },
  // E-posta
  {
    type: 'email',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    labelKey: 'message.violationLabelEmail',
  },
  // IBAN (TR ile başlayan + 24 rakam veya boşluklu versiyonu)
  {
    type: 'iban',
    regex: /\bTR[\s]?\d{2}(?:[\s]?\d{4}){5}(?:[\s]?\d{2})\b/gi,
    labelKey: 'message.violationLabelIban',
  },
  // WhatsApp
  {
    type: 'whatsapp',
    regex: /\b(whats?app|wp|whatsap)\b/gi,
    labelKey: 'message.violationLabelWhatsapp',
  },
  // Telegram
  {
    type: 'telegram',
    regex: /\b(telegram|t\.me)\b/gi,
    labelKey: 'message.violationLabelTelegram',
  },
  // Instagram (@kullanici veya instagram.com)
  {
    type: 'instagram',
    regex: /\b(instagram|insta)\b|@[a-zA-Z0-9_.]{2,}/gi,
    labelKey: 'message.violationLabelInstagram',
  },
  // Harici link (tarodan.com dışı URL)
  {
    type: 'external_link',
    regex: /\bhttps?:\/\/(?!(?:www\.)?tarodan\.com)\S+/gi,
    labelKey: 'message.violationLabelExternalLink',
  },
];

export function detectViolations(text: string): ContentViolation[] {
  if (!text) return [];
  const found: ContentViolation[] = [];
  const seen = new Set<string>();
  for (const { type, regex, labelKey } of PATTERNS) {
    const matches = text.match(regex);
    if (matches) {
      const label = i18n.t(labelKey);
      for (const match of matches) {
        const key = `${type}:${match.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          found.push({ type, match, label });
        }
      }
    }
  }
  return found;
}

export function hasContentViolation(text: string): boolean {
  return detectViolations(text).length > 0;
}

export function getViolationMessage(violations: ContentViolation[]): string {
  if (violations.length === 0) return '';
  const uniqueLabels = Array.from(new Set(violations.map(v => v.label)));
  return i18n.t('message.violationDetected', { labels: uniqueLabels.join(', ') });
}

/**
 * Mesajdaki [IMG:url] işaretini URL'ye parse eder.
 * Ör: "bak bu güzel [IMG:https://s3.../a.jpg]" → { text: "bak bu güzel ", images: ["https://..."] }
 *
 * Şemasız değerleri de kabul eder (çıplak S3 key: "dev/messages/x.jpg", relatif
 * yol: "/photos/x.jpg") — sunucu her zaman mutlak http(s) URL döndürmeyebilir.
 * Çözümü kasıtlı olarak burada YAPMIYORUZ: mutlak/çıplak/relatif ayrımı
 * `resolveImageUrl` (`@/utils/imageUrl`) sorumluluğunda, tek kaynak orada kalsın.
 * `]` ve boşluk sınırı (`[^\]\s]+`) korunuyor ki mesaj gövdesinin geri kalanı
 * yutulmasın.
 */
export interface ParsedMessage {
  text: string;
  images: string[];
}

const HTTP_URI_RE = /^https?:\/\//i;
// Herhangi bir URI şeması: "file:", "data:", "ph:", "javascript:", "blob:", ...
const ANY_URI_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * `[IMG:…]` hedefi için ŞEMA BEYAZ LİSTESİ.
 *
 * Mesaj gövdesi güvenilmez girdi: içerik filtresi (`detectViolations`) yalnız
 * KULLANICININ YAZDIĞI metne uygulanıyor, karşı taraf gövdeye elle
 * `[IMG:file:///etc/passwd]`, `[IMG:data:text/html,…]`, `[IMG:ph://…]` veya
 * `[IMG:javascript:…]` yazabiliyor. `resolveImageUrl` lokal şemaları OLDUĞU GİBİ
 * `expo-image`'e geçirdiği için bu değerler yerel dosya okuma denemesine ya da
 * alıcının kendi galerisinden bir görselin baloncukta belirmesine (UI spoof)
 * dönüşebilir.
 *
 * Kabul edilenler:
 *   - mutlak `http(s)://`
 *   - `/` ile başlayan web-public relatif yol
 *   - çıplak depolama key'i (şemasız) — `..` segmenti içermemek şartıyla
 * Diğer her şey atılır: işaret metinden yine silinir (ham `[IMG:…]` metni
 * baloncukta görünmez) ama `images`'a EKLENMEZ, yani hiç render edilmez.
 *
 * Not: meşru `file:` kullanımı olan yerel yükleme önizlemesi bu yoldan GEÇMEZ —
 * `MessageInputBar` `pendingImage.uri`'yi doğrudan RN `<Image>`'a veriyor.
 */
function isAllowedImageTarget(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (HTTP_URI_RE.test(s)) return true;
  if (ANY_URI_SCHEME_RE.test(s)) return false;
  // Şemasız: çıplak key veya `/` relatif yol. Dizin çıkışı kabul edilmez —
  // yüzde kodlanmış (`%2e%2e`) ve ters bölülü varyantlar dahil. Çözme
  // başarısız olursa (bozuk kodlama) değeri kabul etmeyiz.
  let decoded: string;
  try {
    decoded = decodeURIComponent(s);
  } catch {
    return false;
  }
  return !decoded
    .replace(/\\/g, '/')
    .split('/')
    .includes('..');
}

export function parseMessageContent(content: string): ParsedMessage {
  if (!content) return { text: '', images: [] };
  const images: string[] = [];
  const text = content.replace(/\[IMG:([^\]\s]+)\]/g, (_, url: string) => {
    if (isAllowedImageTarget(url)) images.push(url);
    return '';
  }).trim();
  return { text, images };
}

/**
 * Liste önizlemesi için [IMG:url] işaretini "📷 Fotoğraf" etiketine çevirir.
 * Ör: "[IMG:https://...]" → "📷 Fotoğraf", "bak [IMG:...]" → "bak 📷 Fotoğraf"
 */
export function formatMessagePreview(content: string): string {
  if (!content) return '';
  const { text, images } = parseMessageContent(content);
  if (images.length === 0) return text;
  const photoLabel = i18n.t('message.photoLabel'); // reuse — ThreadRow'un kendi etiketiyle aynı
  return text ? `${text} ${photoLabel}` : photoLabel;
}

export function embedImageInMessage(existingText: string, imageUrl: string): string {
  const base = existingText ? existingText.trim() + ' ' : '';
  return `${base}[IMG:${imageUrl}]`;
}
