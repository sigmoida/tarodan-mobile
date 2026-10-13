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
  // Caption / badge micro-text. The smallest step below `xs`; use this instead
  // of arbitrary `text-[10px]`/`text-[11px]` values for dense labels/badges.
  "2xs": 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
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
} as const;

export type Typography = typeof typography;
