import { StyleSheet } from 'react-native';
import { GLASS_ICON_BUTTON_SIZE, theme } from '@/ui';

const { colors, spacing, typography } = theme;

/** Half the column gap of the result grid: each cell pads this much on both sides. */
export const CELL_HALF_GAP = spacing[1.5];

// Arama ekranının route-local stylesheet'i. Kart ve sıralama paneli artık ortak
// (`@/components/product`); burada yalnız üst bardaki arama alanı, öneri paneli ve liste düzeni kalır.
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  // Sonuç alanı: absolute üst çubukları barındırır; yukarı kayan çubukları kırpar.
  resultsArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  // Üst çubuklar (filtre/sıralama + çipler + sayım) — absolute katman, liste üstünde durur.
  collapsibleBars: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  // Ortak araç çubuğu kabuğu (denetimler + çipler).
  toolbar: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    backgroundColor: colors.surface.DEFAULT,
    position: 'relative',
    zIndex: 10,
  },
  // Üst bardaki arama alanı: cam hap satırın kalan genişliğine yayılır; içindeki Input çerçevesiz,
  // zeminsiz (yüzeyi cam çizer), yüksekliği cam düğme çapı.
  headerField: {
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  headerInputContainer: {
    marginBottom: spacing[0],
  },
  headerInputField: {
    minHeight: GLASS_ICON_BUTTON_SIZE,
    borderWidth: 0,
    backgroundColor: colors.transparent,
  },
  // Öneri / son aramalar SAYFASI: üst barın altındaki tüm alanı kaplar (çubuklar + sonuçlar üstünde).
  suggestionsPage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    backgroundColor: colors.surface.DEFAULT,
  },
  suggestionsScroll: { flex: 1 },
  acSection: {
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  // Bölüm başlığı (Öneriler, Ürünler, …): normal yazım, gövde metin rengi, kalın.
  acSectionTitle: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1.5],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.body,
  },
  acItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    minHeight: theme.minTouchTarget,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  acItemText: { fontSize: typography.fontSize.sm, color: colors.text.heading, flex: 1 },
  acItemMeta: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing[0.5] },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  // "Son aramalar" başlığı öneri bölüm başlıklarıyla aynı: gövde rengi, kalın.
  recentSearchesTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.body,
  },
  clearRecentText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.minTouchTarget,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  recentSearchText: { flex: 1, fontSize: typography.fontSize.sm, color: colors.text.heading },
  // FlashList `gap`/`columnWrapperStyle` desteklemez: boşluk hücre dolgusuyla verilir (web `gap-3`).
  // İçerik dolgusu: yalnız padding* geçerli; paddingTop ekranda ölçülen çubuk yüksekliğiyle ezilir.
  // Yatay: içerik 16 - 6 = 10 + hücre 6 → kenar boşluğu 16, kartlar arası 6 + 6 = 12; ızgarada kart
  // genişliği (W - 20) / 2 - 12 = (W - 32 - 12) / 2 (eskisiyle aynı), tek sütunda W - 20 - 12 = W - 32.
  // Tablets: the screen sets `paddingHorizontal` to `pageGutter - CELL_HALF_GAP` (same value on phones).
  listContent: {
    paddingHorizontal: spacing[4] - CELL_HALF_GAP,
    paddingBottom: spacing[4],
    paddingTop: spacing[2],
  },
  // Hücre: satırlar arası boşluk altta, yatayda simetrik. `flex: 1` → kart satırın en uzun hücresine yayılır.
  cell: { flex: 1, paddingBottom: spacing[3], paddingHorizontal: CELL_HALF_GAP },
  // Üst çubuklar ölçülene kadar liste görünmez ama YERLEŞİR (opacity, display değil):
  // doğru üst boşlukla tek seferde konumlanır, kullanıcı ara kareyi görmez.
  listWrap: { flex: 1 },
  listWrapHidden: { flex: 1, opacity: 0 },
  listFooter: { paddingVertical: spacing[4] },
});
