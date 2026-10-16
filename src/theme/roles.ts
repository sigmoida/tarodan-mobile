/**
 * Rol token'ları — ham ölçek (spacing/radius/colors) yerine "ne için" sorusunun tek cevabı.
 * Değerler web'in telefon genişliğindeki (<640px) kullanımından alınır
 * (`tarodan-app/packages/ui` + `apps/web`). Ekranlar buradaki rolleri kullanır; ölçek dışı
 * değer (fontSize 13, radius 12 gibi) yazılmaz.
 */
import { colors } from "./colors";
import { radius } from "./radius";
import { lineHeight as lineHeightScale } from "./typography";

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

/**
 * Üst barın içerik satırının ALTINA eklenen boşluk (pt). Satır 52, düğmeler 44 → üst/alt 4pt; durum
 * çubuğu ile düğmeler arasında güvenli alandan gelen doğal bir boşluk varken altta yalnız 4pt kalıyor,
 * bar alttan sıkışık görünüyordu. Bu pay tüm üst barlara (ScreenHeader, TitleShell, ana sayfa yüzen
 * barı) ve TEK inset formülüne (`useHeaderBarInset`) eklenir — barlar arası yükseklik aynı kalır.
 * Sheet başlıkları (SheetHeader) kullanmaz.
 */
export const headerBottomPad = 12;

/** Asgari dokunma alanı (Apple HIG / WCAG). Görsel ölçü küçükse fark `hitSlop` ile kapatılır. */
export const minTouchTarget = 44;

/**
 * Radius rolleri — web'deki gibi: ürün kartı `rounded` (4); kart, bölüm, buton, input ve rozet
 * `rounded-lg` (6); modal `rounded-xl` (8); alttan açılan sheet'in üst köşeleri `2xl` (10);
 * chip ve avatar `full`.
 *
 * ROZET KURALI (tek köşe): her rozet — `Badge`, `StatusBadge`, `ProductBadge` (görsel üstü vitrin
 * rozeti dahil), etiket modundaki `Chip` (seçim durumu yok), `Pill` (varsayılan `shape="badge"`),
 * buton içi sayaç, durum/bilgi etiketleri ve bunlarla AYNI SATIRDA duran küçük açma/kapama
 * (ör. profildeki "Herkese açık" görünürlük çipi, `Chip shape="badge"`) — `radiusRole.badge`
 * kullanır (web `Badge` `rounded-lg` = 6). İstisnalar yalnız ikidir ve rozet DEĞİLDİR:
 *   1. `chip` (tam hap): tek/çoklu seçim KONTROLLERİ — filtre çipleri, `ChipTabs`, seçenek çipleri.
 *   2. `counter` (daire): ikon üstündeki okunmamış/adet sayacı (`CountBadge`, web `rounded-full`).
 * Ekranda elle köşe yazılmaz; yeni bir rozet bu rollerden birini seçer.
 */
export const radiusRole = {
  productCard: radius.DEFAULT,
  card: radius.lg,
  section: radius.lg,
  button: radius.lg,
  input: radius.lg,
  badge: radius.lg,
  counter: radius.full,
  modal: radius.xl,
  sheet: radius['2xl'],
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

/**
 * Pasif/yardımcı bar ikonu rengi — alt menüdeki pasif sekme ikonu ile üst bardaki sekme-kökü
 * ikonları (bildirim, sepet) AYNI gri. Tek kaynak; sabit renk yazılmaz.
 */
export const inactiveIconColor = colors.text.subtle as string;

/**
 * Alt menü (yüzen hap) sekme etiketi — tipografi ölçeğinden BAĞIMSIZ sabit rol (iOS tab bar
 * etiketi 10–11pt). Ölçek büyüse de 4 sekme + "+" düğmesi 360pt genişlikte sığsın diye
 * (en uzun etiket: "Bildirimler" / "Notifications") burada sabitlenir; satır yüksekliği aynı oran.
 */
export const tabBarLabel = {
  fontSize: 11,
  lineHeight: 11 * lineHeightScale.normal,
} as const;

/** İskelet animasyonu türü — `pulse` (web `animate-pulse`), `shimmer` (parlama şeridi) ya da `none`. */
export type SkeletonAnimationKind = "pulse" | "shimmer" | "none";

/**
 * Yükleme sistemi rol token'ları (`src/ui/loading/` TEK tüketici). Ekran bu değerleri okumaz;
 * görünümü değiştirmek için yalnız burası düzenlenir:
 *   - `delayMs` / `minVisibleMs`: `useDelayedLoading` — `delayMs`'ten kısa yüklemede gösterge HİÇ
 *     çıkmaz (göz kırpması yok); çıktıysa en az `minVisibleMs` kalır (iskelet → içerik titremesi yok).
 *   - `indicator`: `LoadingIndicator` kutu ölçüleri (pt) ve ton renkleri.
 *   - `skeleton`: TÜM iskeletlerin ortak animasyonu (tek sürücü) ve renkleri. `duration` tam döngü (ms).
 */
export const loading = {
  delayMs: 150,
  minVisibleMs: 300,
  indicator: {
    /** sm = ikon sm (16; düğme içi), md = ikon md (20; satır/alt yükleme), lg = tam ekran (36). */
    size: { sm: iconSize.sm, md: iconSize.md, lg: 36 },
    color: {
      primary: colors.primary[600] as string,
      inverted: colors.text.inverted as string,
      muted: colors.text.subtle as string,
    },
  },
  skeleton: {
    animation: "pulse" as SkeletonAnimationKind,
    duration: 2000,
    /** `pulse`: döngünün ortasındaki opaklık (web animate-pulse 0.5). */
    pulseMinOpacity: 0.5,
    /** Web `bg-border-subtle`. */
    baseColor: colors.border.subtle as string,
    /** `shimmer`: zeminin üstünden geçen parlama şeridinin rengi. */
    highlightColor: colors.white as string,
  },
} as const;

export const roles = {
  iconSize,
  controlHeight,
  minTouchTarget,
  headerHeight,
  headerBottomPad,
  radiusRole,
  priceColor,
  counterBadgeColor,
  inactiveIconColor,
  tabBarLabel,
  loading,
} as const;
