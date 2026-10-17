import { Platform, type PressableAndroidRippleConfig, type ViewStyle } from 'react-native';
import { theme } from './theme';

/**
 * Basılı geri bildirim — TEK kaynak (Button, Chip, IconButton, ListRowCard, SegmentedButtons,
 * SectionCardAction; `GlassIconButton` / `HeaderIconButton` / `ActionSheet` satırı ile aynı dil):
 *
 * - **Android**: `android_ripple` (Material dalgası). Basılı opaklık YOK — ripple yeterli; ikisi
 *   birlikte "çift" geri bildirim verir.
 * - **iOS**: ripple yok; bileşenin mevcut basılı stili (opaklık / zemin) aynen kalır.
 *
 * Köşe yarıçapı: RN'de sınırlı ripple'ın maskesi DİKDÖRTGENDİR (`ReactDrawableHelper.getMask`),
 * `borderRadius`'u bilmez. Bu yüzden sınırlı ripple `foreground: true` çizilir ve kutuya
 * `rippleClip` (`overflow: 'hidden'`) verilir: `ReactViewGroup.dispatchDraw` tuvali yuvarlak
 * dolgu kutusuna kırpar, ön plan (ripple) da bu kırpmanın içinde çizilir → köşeden taşmaz.
 * Zeminsiz ikon düğmeleri `borderless` + `radius` kullanır (kutunun dışına dairesel taşar,
 * kırpma gerekmez).
 */

/** Ripple tonu: açık zeminde koyu dalga, dolu/koyu zeminde (primary, danger…) açık dalga. */
export type RippleTone = 'onLight' | 'onDark';

const RIPPLE_COLOR: Record<RippleTone, string> = {
  onLight: theme.colors.overlay.black10,
  onDark: theme.colors.overlay.white20,
};

export interface RippleOptions {
  tone?: RippleTone;
  /** Zeminsiz ikon düğmesi: dalga kutunun dışına (dairesel) taşar. `radius` ile birlikte. */
  borderless?: boolean;
  /** Dalga yarıçapı (pt). Sınırsız dalgada önerilir (ör. 44pt dokunma kutusu → 22). */
  radius?: number;
}

/** Android'de `android_ripple` yapılandırması; iOS'ta `undefined` (ripple yok). */
export function androidRipple(options: RippleOptions = {}): PressableAndroidRippleConfig | undefined {
  if (Platform.OS !== 'android') return undefined;
  const { tone = 'onLight', borderless = false, radius } = options;
  return {
    color: RIPPLE_COLOR[tone],
    borderless,
    ...(radius != null ? { radius } : null),
    // Sınırlı dalga ön planda: dolu zeminin üstünde görünür ve `rippleClip` ile köşeye kırpılır.
    ...(borderless ? null : { foreground: true }),
  };
}

const CLIP: ViewStyle = { overflow: 'hidden' };

/**
 * Sınırlı ripple'ı köşe yarıçapına kırpan kutu stili — yalnız Android (iOS'ta yerleşime/gölgeye
 * dokunulmaz). Pressable `style` dizisine eklenir.
 */
export function rippleClip(): ViewStyle | undefined {
  return Platform.OS === 'android' ? CLIP : undefined;
}

/**
 * Basılı stil (opaklık / zemin) uygulanacak mı: iOS'ta basılıyken evet; Android'de ripple
 * geri bildirimi verdiği için hayır.
 */
export function showPressedStyle(pressed: boolean): boolean {
  return pressed && Platform.OS !== 'android';
}

/**
 * Paylaşılan iOS basılı stili (opaklık) — kendi `Pressable`'ını çizen küçük kontroller (ör. satır
 * içi seçim kutusu) yerel opaklık değeri tanımlamaz: `showPressedStyle(pressed) && pressedStyle`.
 * Değer `GlassIconButton` basılı opaklığıyla aynı.
 */
export const pressedStyle: ViewStyle = { opacity: 0.7 };
