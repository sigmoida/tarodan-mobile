/**
 * Tipografi token'ları — web (`apps/web` → `next/font` Noto_Sans 400/500/600/700) ile aynı aile.
 *
 * Not: web `@tarodan/design-tokens` token'ı hâlâ "Inter" yazıyor ama web gerçekte Noto Sans
 * yüklüyor (`apps/web/src/app/[locale]/layout.tsx`). Burada gerçeği yazıyoruz.
 */
export const fontFamily = {
  sans: ["Noto Sans", "system-ui", "-apple-system", "sans-serif"],
  display: ["Noto Sans", "system-ui", "-apple-system", "sans-serif"],
} as const;

export const fontSize = {
  // Mobil ölçek (iOS HIG'e yakın) — TEK kaynak: Text variant'ları, Button/Input/Chip/Badge ve
  // `typography.fontSize.*` okuyan her stil buradan beslenir. Yeni ölçek dışı sayı yazma.
  // Gövde basamakları (xs/sm/base) web ile aynı (12/14/16; iOS caption/subheadline/callout);
  // başlık basamakları web'den küçük kalır (web xl 20 / 2xl 24 / 3xl 30 / 4xl 36 telefonda iri).
  // `lg` 17 = iOS "headline": yan menü satırı (`h3`) ve bölüm başlıkları bu boyda.
  // Dense label / rozet mikro metni (`text-[10px]` yerine).
  "2xs": 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 17,
  xl: 20,
  "2xl": 22,
  "3xl": 26,
  "4xl": 30,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.7,
} as const;

/**
 * Dinamik yazı boyutu (iOS "Daha Büyük Metin" / Android "Yazı tipi boyutu") üst sınırı — rol bazlı
 * TEK kaynak (`maxFontSizeMultiplier`). Kullanıcı ölçeği bu oranın üstüne çıksa da metin en çok
 * bu kadar büyür; altındaki ölçekler aynen uygulanır.
 * - `body`: gövde / açıklama / etiket metni (`Text` gövde varyantları, `RawText` varsayılanı).
 * - `heading`: başlıklar (`Text` display/h1–h3) — zaten iri; dar ekranda tek satırı korur.
 * - `control`: sabit yükseklikli kontrol etiketi (Button, Chip, Badge/Pill, CountBadge, sekme
 *   etiketi, Input/Textarea metni) — kutu `minHeight` ile büyür ama taşma/kırpılma olmasın.
 * Global `Text.defaultProps` YOK: bileşenler bu değeri prop olarak verir.
 */
export const maxFontScale = {
  body: 1.35,
  heading: 1.25,
  control: 1.2,
} as const;

export type FontScaleRole = keyof typeof maxFontScale;

/** Web gövdesi `letter-spacing: -0.01em` — RN'de pt cinsinden: fontSize × bu katsayı. */
export const bodyLetterSpacingEm = -0.01;

/**
 * Yüklenen Noto Sans dosyalarının `useFonts` anahtarları (expo-font bu adlarla kaydeder).
 * Android'de ağırlık için AYRI aile adı gerekir: aynı aileye `fontWeight` vermek sentetik
 * (sahte) kalın üretir. Bu yüzden her ağırlık kendi dosyasına eşlenir.
 */
export const brandFontFiles = {
  400: "NotoSans_400Regular",
  500: "NotoSans_500Medium",
  600: "NotoSans_600SemiBold",
  700: "NotoSans_700Bold",
} as const;

export type BrandFontWeight = keyof typeof brandFontFiles;

type WeightInput = string | number | undefined | null;

/** RN `fontWeight` değerini (400, '600', 'bold', 'normal', 'medium'…) yüklenen 4 ağırlıktan birine indirger. */
export function normalizeFontWeight(weight: WeightInput): BrandFontWeight {
  if (weight == null) return 400;
  if (weight === "bold") return 700;
  if (weight === "normal") return 400;
  if (weight === "medium") return 500;
  if (weight === "semibold") return 600;
  const n = typeof weight === "number" ? weight : parseInt(String(weight), 10);
  if (!Number.isFinite(n) || n <= 400) return 400;
  if (n <= 500) return 500;
  if (n <= 600) return 600;
  return 700;
}

export interface BrandFontStyle {
  fontFamily: string;
  fontWeight: "normal";
}

/**
 * TEK eşleme fonksiyonu: `fontWeight` → doğru Noto Sans dosyası.
 *
 * - `enabled` = marka fontu yüklendi mi (`@/ui` `useBrandFont()`; kök layout `useFonts`
 *   sonrası sağlar). Yüklenmediyse/yüklenemediyse `null` döner ve sistem fontu kalır — kayıtsız
 *   bir aile adı verip iOS'ta uyarı riskine girmeyiz. Testte sağlayıcı yok → `false` → stil aynı.
 * - Stil zaten bir `fontFamily` taşıyorsa (ör. 'Courier', 'monospace') ya da `fontStyle: 'italic'`
 *   ise dokunulmaz → `null` (italik sistem fontunda kalır; italik Noto Sans dosyası yok).
 * - Dönüşte `fontWeight: 'normal'`: ağırlık dosyanın kendisinde; Android'de sentetik kalını,
 *   iOS'ta aile içinde yanlış dosya seçimini önler.
 */
export function brandFontStyle(
  enabled: boolean,
  weight: WeightInput,
  explicitFamily?: string | null,
  fontStyle?: string | null,
): BrandFontStyle | null {
  // İtalik: Noto Sans italik dosyaları bundle'a eklenmedi (boyut) → italik stil sistem fontunda
  // kalır (ağırlık da sistem fontunun kendisiyle); marka ailesi/`fontWeight: 'normal'` uygulanmaz.
  if (!enabled || explicitFamily || fontStyle === "italic") return null;
  return {
    fontFamily: brandFontFiles[normalizeFontWeight(weight)],
    fontWeight: "normal",
  };
}

/** Gövde harf aralığı (web -0.01em). Marka fontu yokken uygulanmaz (sistem fontunun kendi aralığı). */
export function bodyLetterSpacing(
  enabled: boolean,
  fontSizePt: number | undefined,
): number | undefined {
  if (!enabled || !fontSizePt) return undefined;
  return Math.round(fontSizePt * bodyLetterSpacingEm * 100) / 100;
}

export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  maxFontScale,
} as const;

export type Typography = typeof typography;
