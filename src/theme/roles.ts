/**
 * Rol token'ları — ham ölçek (spacing/radius/colors) yerine "ne için" sorusunun tek cevabı.
 * Değerler web'in telefon genişliğindeki (<640px) kullanımından alınır
 * (`tarodan-app/packages/ui` + `apps/web`). Ekranlar buradaki rolleri kullanır; ölçek dışı
 * değer (fontSize 13, radius 12 gibi) yazılmaz.
 */
import { colors } from "./colors";
import { radius } from "./radius";

/** İkon boyutları (pt) — web heroicons h-4 / h-5 / h-6. */
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

/** Kontrol (buton/input/select) yükseklikleri — web h-8 / h-10 / h-12 / h-14. */
export const controlHeight = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
} as const;

/**
 * Üst bar (ScreenHeader / SheetHeader) içerik yüksekliği — güvenli alan (status bar / çentik)
 * HARİÇ. Tüm yığın ekranlarında, tab köklerinde ve sheet başlıklarında aynı sabit; ekran
 * kendi yüksekliğini seçmez. Güvenli alan `useHeaderTopInset()` ile eklenir.
 */
export const headerHeight = 52;

/** Asgari dokunma alanı (Apple HIG / WCAG). Görsel ölçü küçükse fark `hitSlop` ile kapatılır. */
export const minTouchTarget = 44;

/**
 * Radius rolleri — web'deki gibi: ürün kartı `rounded` (4); kart, bölüm, buton, input ve rozet
 * `rounded-lg` (6); modal `rounded-xl` (8); chip ve avatar `full`.
 */
export const radiusRole = {
  productCard: radius.DEFAULT,
  card: radius.lg,
  section: radius.lg,
  button: radius.lg,
  input: radius.lg,
  badge: radius.lg,
  modal: radius.xl,
  chip: radius.full,
  avatar: radius.full,
} as const;

/**
 * Fiyat renkleri — web: kart fiyatı primary-600 bold, ürün detayı primary-500, indirimde eski
 * fiyat `text-subtle line-through`.
 */
export const priceColor = {
  card: colors.primary[600],
  detail: colors.primary[500],
  original: colors.text.subtle,
} as const;

/** Sayaç rozeti (sepet/mesaj/bildirim adedi) zemini — web danger-500. */
export const counterBadgeColor = colors.danger[500] as string;

export const roles = {
  iconSize,
  controlHeight,
  minTouchTarget,
  headerHeight,
  radiusRole,
  priceColor,
  counterBadgeColor,
} as const;
