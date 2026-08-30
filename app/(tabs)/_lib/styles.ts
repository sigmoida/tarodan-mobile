// Home ekranının stilleri — orijinal (tabs)/index.tsx'ten birebir taşındı.
import { StyleSheet, Dimensions } from 'react-native';
import { theme } from '@/ui';

const { colors, typography } = theme;
const { width } = Dimensions.get('window');
export const CARD_WIDTH = (width - 48) / 2;

// `Text` bileşeni `variant` verilmezse 'body' varsayar (Text.tsx:145-146) VE
// `StyleSheet.flatten([variantStyle[variant], ..., style])` variant stilini
// ÖNCE, `style` prop'unu SONRA flatten eder (Text.tsx:159-165) — yani `style`
// yalnız KENDİ taşıdığı anahtarları override eder. Bu ekrandaki `sectionTitle` /
// `brandLogoText` / `categoryCount` / `companySectionTitle` Text'lerinin hiçbiri
// `variant` GEÇMİYOR ve hiçbiri kendi `lineHeight`'ını set ETMİYOR (yalnız
// hardcoded `fontSize` taşıyorlar), o yüzden gerçek satır yüksekliği o Text'in
// KENDİ fontSize'ından türetilemez — HER ZAMAN body varyantının varsayılanı
// kullanılır: fontSize.base(16) × lineHeight.normal(1.5) = 24. Doğrulandı:
// src/ui/components/Text.tsx:145,159-165.
const DEFAULT_TEXT_LINE_HEIGHT = typography.fontSize.base * typography.lineHeight.normal; // 24

// "Popüler İlanlar" rafının loading/empty/content dallarının ÜÇÜ de aynı
// minHeight'i paylaşmalı, yoksa veri gelince kutu büyüyüp alttaki bölümleri
// aşağı iter. Yüksekliği yatay kart rafının gerçek metriklerinden türetiyoruz:
//   - productImage.height (aşağıdaki POPULAR_RAIL_IMAGE_HEIGHT) ve
//     productContent dikey padding'i (theme.spacing[3.5] × 2) GERÇEKTEN tek
//     kaynaktan geliyor — `productImage`/`productContent` stilleri de aynı
//     sabitleri kullanıyor (bkz. aşağıda), o ikisi değişirse bu türetme de
//     otomatik değişir.
//   - başlık/meta/fiyat satırları İSE `ProductCard.tsx`'in geçtiği `variant`
//     prop'larını (bodySm/caption/h3 — ProductCard.tsx:74,76,78) BİREBİR
//     yansıtıyor. Bu satırlar ProductCard'ın KENDİ `variant` seçimini set
//     ediyor (yukarıdaki DEFAULT_TEXT_LINE_HEIGHT kuralının aksine — o Text'ler
//     variant'ı hiç geçmiyordu), o yüzden fontSize.sm/xs/lg türetmeleri DOĞRU;
//     ama ProductCard.tsx başka bir dosya, o yüzden OTOMATİK değil: biri
//     ProductCard.tsx'te variant'ı değiştirirse bu üç sabit elle senkronize
//     edilmeli.
//   - + başlık: `bodySm` varyantı, numberOfLines={2} →
//     (fontSize.sm × lineHeight.normal) × 2 satır
//   - + meta satırı: `caption` varyantı, marginTop spacing[0.5] →
//     spacing[0.5] + fontSize.xs × lineHeight.normal
//   - + fiyat satırı: `h3` varyantı, marginTop spacing[1] →
//     spacing[1] + fontSize.lg × lineHeight.snug
const POPULAR_RAIL_IMAGE_HEIGHT = 140;
const POPULAR_RAIL_CONTENT_PADDING = theme.spacing[3.5] * 2;
const POPULAR_RAIL_TITLE_HEIGHT = typography.fontSize.sm * typography.lineHeight.normal * 2;
const POPULAR_RAIL_META_HEIGHT = theme.spacing[0.5] + typography.fontSize.xs * typography.lineHeight.normal;
const POPULAR_RAIL_PRICE_HEIGHT = theme.spacing[1] + typography.fontSize.lg * typography.lineHeight.snug;
export const POPULAR_RAIL_MIN_HEIGHT =
  POPULAR_RAIL_IMAGE_HEIGHT +
  POPULAR_RAIL_CONTENT_PADDING +
  POPULAR_RAIL_TITLE_HEIGHT +
  POPULAR_RAIL_META_HEIGHT +
  POPULAR_RAIL_PRICE_HEIGHT;

// Diğer bölümler için de aynı desen: loading/empty/content aynı rezerve
// yüksekliği paylaşmalı ki veri gelince o bölümün ÜSTÜNDEKİ okuma noktası
// kaymasın (bkz. task-2-brief.md). Ortak parça: her `section`in kendi
// `SectionHeader`i — indicator (24pt) ile başlık metninden yüksek olanı +
// altındaki marginBottom (spacing[4]). `sectionTitle` Text'i de yukarıdaki
// DEFAULT_TEXT_LINE_HEIGHT kuralına tabi (variant yok, kendi lineHeight'ı
// yok) — gerçek satır yüksekliği fontSize.xl × lineHeight.snug (27) DEĞİL,
// body varyantının sabit varsayılanı (24).
const SECTION_HEADER_INDICATOR_HEIGHT = 24; // sectionIndicator.height
const SECTION_TITLE_TEXT_HEIGHT = DEFAULT_TEXT_LINE_HEIGHT;
export const SECTION_HEADER_HEIGHT =
  Math.max(SECTION_HEADER_INDICATOR_HEIGHT, SECTION_TITLE_TEXT_HEIGHT) + theme.spacing[4];

// `section` sarmalayıcısının kendi marginBottom'u da rezerve yüksekliğine
// dahil olmalı — içerik `<View style={styles.section}>` içinde render
// oluyor (`HomeSections.tsx`), rezerve `View`'lar bu marjı unutursa gerçek
// yükseklikten hep SECTION_MARGIN_BOTTOM kadar az rezerve edilmiş olur
// (task-2-report.md'deki inceleme notu). `section` stili de bu sabitten
// beslenir — tek kaynak, ayrışma riski yok.
export const SECTION_MARGIN_BOTTOM = 28;

// CategoriesSection: brandLogo kutusunun kendi metrikleri (paddingVertical ×2
// + borderWidth ×2) + başlık metni (brandLogoText — variant yok, kendi
// lineHeight'ı yok → DEFAULT_TEXT_LINE_HEIGHT). Ürün sayısı satırı
// (categoryCount) KOŞULLU render ediyor (`HomeSections.tsx:80`,
// `cat.productCount > 0`) — bu rezerve bir ALT sınır olmalı, o yüzden count
// satırını SAYMIYORUZ: tüm kategorilerin productCount'u 0 ise gerçek yükseklik
// bundan düşük olmaz, count satırı varsa gerçek yükseklik bundan biraz
// YÜKSEK olur — yön hep aşağı iter, hiçbir zaman içerik rezervin üstüne taşıp
// yukarı sıçramaz.
const CATEGORIES_ITEM_PADDING_V = theme.spacing[3.5] * 2;
const CATEGORIES_ITEM_BORDER = 1.5 * 2; // brandLogo.borderWidth, üst+alt
const CATEGORIES_ITEM_TEXT_HEIGHT = DEFAULT_TEXT_LINE_HEIGHT;
const CATEGORIES_RAIL_HEIGHT = CATEGORIES_ITEM_PADDING_V + CATEGORIES_ITEM_BORDER + CATEGORIES_ITEM_TEXT_HEIGHT;
export const CATEGORIES_SECTION_MIN_HEIGHT = SECTION_HEADER_HEIGHT + CATEGORIES_RAIL_HEIGHT + SECTION_MARGIN_BOTTOM;

// FeaturedCollectorSection: featuredCard padding (×2) + üst satır (avatar
// 60pt + borderWidth ×2, metin sütunundan uzun olan öğe) + marginBottom +
// alttaki "Garajını incele" butonu (paddingVertical ×2 + metin satırı).
// NOT: `fc.items` doluysa araya 110pt'lik yatay ürün rafı da giriyor
// (featuredProducts) — bilinçli olarak SAYMIYORUZ. Rezervde varsayıp veri
// gelince raf çıkmazsa (items boş) içerik YUKARI sıçrar; bu, okuyucunun tam
// baktığı yerde ters yönde bir kayma yaratır ve mevcut aşağı-itme
// davranışından (bu task'ın çözdüğü kusur) daha rahatsız edicidir. Rafı
// saymayıp bazen ~110pt eksik rezerve etmek — yön hep aşağı — daha az kötü.
const FEATURED_CARD_PADDING = 18 * 2; // featuredCard.padding
const FEATURED_HEADER_HEIGHT = 60 + 3 * 2; // featuredAvatar.height + borderWidth×2
const FEATURED_HEADER_MARGIN = 18; // featuredHeader.marginBottom
const FEATURED_BUTTON_HEIGHT =
  theme.spacing[2.5] * 2 + typography.fontSize.sm * typography.lineHeight.normal;
export const FEATURED_COLLECTOR_SECTION_MIN_HEIGHT =
  SECTION_HEADER_HEIGHT +
  FEATURED_CARD_PADDING +
  FEATURED_HEADER_HEIGHT +
  FEATURED_HEADER_MARGIN +
  FEATURED_BUTTON_HEIGHT +
  SECTION_MARGIN_BOTTOM;

// BoostedRail / ProductsGrid: aynı `ProductCard` raf/hücre (bkz.
// PopularProducts) — AMA reserve'leri POPULAR_RAIL_MIN_HEIGHT'i MİRAS ALAMAZ.
// POPULAR_RAIL_MIN_HEIGHT bir ÜST sınır: "başlık HER ZAMAN 2 satır"
// (ProductCard `numberOfLines={2}` — kısa başlık 1 satıra sığabilir) ve "meta
// satırı HER ZAMAN var" (`metaLabel` boşsa ProductCard.tsx:75-77 hiç render
// ETMİYOR) varsayıyor; Popüler İlanlar rafında bu güvenli çünkü o rafın
// `popularRailContent` sarmalayıcısı bu minHeight'i HER ÜÇ dalda da taşıyor
// (aşağıda) — kart küçük gelse bile kutu küçülemez.
//
// BoostedRail/ProductsGrid'te ise `boostedRailReserved`/`productsGridReserved`
// yalnız YÜKLEME dalında bu minHeight'i taşıyor; YÜKLENMİŞ dal düz `styles.section`
// kullanıyor (bkz. HomeSections.tsx BoostedRail/ProductsGrid), yani bir taban
// yok. Sponsorlu/ızgara ürünleri kısa başlıklı ve brand/scale'siz gelirse
// gerçek yükseklik POPULAR_RAIL_MIN_HEIGHT tabanlı rezervin ALTINDA kalır ve
// içerik YUKARI sıçrar — bu, kaymayı önlemek isteyen mekanizmanın tam tersi
// bir regresyon. Bu yüzden burada AYRI bir ALT sınır türetiyoruz: 1 satır
// başlık, meta satırı YOK (floor senaryosu — bu iki dal her zaman en az bunun
// kadar yer kaplar, hiçbir zaman daha az değil).
const RAIL_CARD_FLOOR_TITLE_HEIGHT = typography.fontSize.sm * typography.lineHeight.normal; // 1 satır (bodySm)
const RAIL_CARD_FLOOR_HEIGHT =
  POPULAR_RAIL_IMAGE_HEIGHT +
  POPULAR_RAIL_CONTENT_PADDING +
  RAIL_CARD_FLOOR_TITLE_HEIGHT +
  // meta satırı YOK (floor) — bkz. yukarıdaki gerekçe
  POPULAR_RAIL_PRICE_HEIGHT;
export const BOOSTED_RAIL_MIN_HEIGHT = SECTION_HEADER_HEIGHT + RAIL_CARD_FLOOR_HEIGHT + SECTION_MARGIN_BOTTOM;

// ProductsGrid: grid hücreleri de aynı `ProductCard`; ilk satırın yüksekliğini
// rezerve ediyoruz (satır sayısı veriye göre değişir). Aynı alt-sınır
// gerekçesiyle RAIL_CARD_FLOOR_HEIGHT'i paylaşıyor (bkz. yukarısı).
export const PRODUCTS_GRID_MIN_HEIGHT = SECTION_HEADER_HEIGHT + RAIL_CARD_FLOOR_HEIGHT + SECTION_MARGIN_BOTTOM;

// CollectionsSection: collectionCard — sabit görsel yüksekliği (110) +
// collectionInfo padding (×2) + isim satırı (collectionName, fontSize.sm) +
// meta satırı (collectionMeta, marginTop + fontSize.xs).
const COLLECTION_IMAGE_HEIGHT = 110; // collectionImage.height
const COLLECTION_INFO_PADDING = theme.spacing[3] * 2;
const COLLECTION_NAME_HEIGHT = typography.fontSize.sm * typography.lineHeight.normal;
const COLLECTION_META_HEIGHT = theme.spacing[1] + typography.fontSize.xs * typography.lineHeight.normal;
const COLLECTIONS_RAIL_HEIGHT =
  COLLECTION_IMAGE_HEIGHT + COLLECTION_INFO_PADDING + COLLECTION_NAME_HEIGHT + COLLECTION_META_HEIGHT;
export const COLLECTIONS_SECTION_MIN_HEIGHT = SECTION_HEADER_HEIGHT + COLLECTIONS_RAIL_HEIGHT + SECTION_MARGIN_BOTTOM;

// CompanyOfWeekSection: `companySection` kendi paddingVertical'ını taşıyor
// (spacing[6] ×2, section marginBottom'a ek — bu sarmalayıcı `styles.section`
// KULLANMIYOR, kendi `marginBottom: spacing[6]`si var, bkz. aşağıdaki
// stylesheet). İçindeki `companyCard`: padding(×2) + profil satırı (avatar
// 70pt + borderWidth×2) + "Öne Çıkan Ürünler" başlığı (companySectionTitle,
// fontSize.base) + "Mağazayı İncele" butonu (viewStoreButton marginTop +
// viewStoreButtonGradient paddingVertical×2 + metin satırı). En yavaş query
// olduğu için (fallback zinciri) bu bölüm de aynı üç dallı deseni izliyor.
const COMPANY_CARD_PADDING = theme.spacing[5] * 2; // companyCard.padding
const COMPANY_HEADER_HEIGHT = 70 + 3 * 2; // companyAvatar.height + borderWidth×2
const COMPANY_HEADER_MARGIN = 18; // companyHeader.marginBottom
// companySectionTitle: variant yok, kendi lineHeight'ı yok →
// DEFAULT_TEXT_LINE_HEIGHT kuralına tabi. marginTop (spacing[3]) ÖNCEDEN
// sayılmıyordu (yalnız marginBottom vardı) — eklendi.
const COMPANY_SECTION_TITLE_HEIGHT =
  theme.spacing[3] /* marginTop */ + DEFAULT_TEXT_LINE_HEIGHT + theme.spacing[3.5]; /* marginBottom */
const COMPANY_BUTTON_MARGIN = 18; // viewStoreButton.marginTop
const COMPANY_BUTTON_HEIGHT =
  theme.spacing[3.5] * 2 + typography.fontSize.base * typography.lineHeight.normal; // viewStoreButtonGradient
const COMPANY_SECTION_PADDING_V = theme.spacing[6] * 2; // companySection.paddingVertical ×2
const COMPANY_SECTION_MARGIN_BOTTOM = theme.spacing[6]; // companySection.marginBottom
export const COMPANY_OF_WEEK_SECTION_MIN_HEIGHT =
  SECTION_HEADER_HEIGHT +
  COMPANY_SECTION_PADDING_V +
  COMPANY_SECTION_MARGIN_BOTTOM +
  COMPANY_CARD_PADDING +
  COMPANY_HEADER_HEIGHT +
  COMPANY_HEADER_MARGIN +
  COMPANY_SECTION_TITLE_HEIGHT +
  COMPANY_BUTTON_MARGIN +
  COMPANY_BUTTON_HEIGHT;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  header: {
    backgroundColor: colors.primary[600]!,
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[5],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  logoAccent: {
    color: colors.gray[200],
  },
  headerActions: {
    flexDirection: 'row',
    backgroundColor: colors.overlay.white20,
    borderRadius: 14,
    padding: theme.spacing[1.5],
    gap: theme.spacing[2],
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.radius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay.white10,
  },
  headerBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: theme.radius['2xl'],
    paddingHorizontal: 5,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary[600]!,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
  },
  headerBadgeText: {
    color: colors.primary[700]!,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
    textAlign: 'center',
  },
  inCartPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600]!,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.xl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  searchBar: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    fontSize: 14,
    color: colors.text.heading,
  },
  scrollView: {
    flex: 1,
  },
  heroBanner: {
    marginHorizontal: theme.spacing[4],
    marginTop: -10,
    marginBottom: theme.spacing[2],
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  heroGradient: {
    padding: theme.spacing[6],
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.muted,
    marginBottom: theme.spacing[1],
  },
  heroSubtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.heading,
    marginBottom: theme.spacing[2.5],
  },
  heroDescription: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: theme.spacing[5],
    lineHeight: 20,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: theme.spacing[2.5],
  },
  heroButtonPrimary: {
    backgroundColor: colors.primary[600]!,
    paddingHorizontal: 18,
    paddingVertical: theme.spacing[3],
    borderRadius: theme.radius['2xl'],
  },
  heroButtonPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  heroButtonSecondary: {
    backgroundColor: colors.surface.DEFAULT,
    paddingHorizontal: 18,
    paddingVertical: theme.spacing[3],
    borderRadius: theme.radius['2xl'],
    borderWidth: 1.5,
    borderColor: colors.border.DEFAULT,
  },
  heroButtonSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.heading,
  },
  section: {
    marginBottom: SECTION_MARGIN_BOTTOM,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIndicator: {
    width: 4,
    height: 24,
    backgroundColor: colors.primary[600]!,
    borderRadius: theme.radius.sm,
    marginRight: theme.spacing[2.5],
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.heading,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary[600]!,
    fontWeight: '600',
  },
  brandsScroll: {
    paddingLeft: theme.spacing[4],
  },
  brandItem: {
    marginRight: theme.spacing[2.5],
  },
  brandLogo: {
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1.5,
    borderColor: colors.border.DEFAULT,
    borderRadius: 12,
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3.5],
    minWidth: 90,
    alignItems: 'center',
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  brandLogoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.heading,
  },
  scalesScroll: {
    paddingLeft: theme.spacing[4],
  },
  scaleChip: {
    backgroundColor: colors.primary[50]!,
    borderWidth: 1.5,
    borderColor: colors.primary[600]!,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: theme.spacing[2.5],
    marginRight: theme.spacing[2.5],
  },
  scaleChipText: {
    fontSize: 14,
    color: colors.primary[600]!,
    fontWeight: '600',
  },
  collectorCard: {
    backgroundColor: colors.surface.DEFAULT,
    marginHorizontal: theme.spacing[4],
    borderRadius: 12,
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  collectorInfo: {
    flexDirection: 'row',
    marginBottom: theme.spacing[4],
  },
  collectorDetails: {
    flex: 1,
    marginLeft: theme.spacing[3],
  },
  collectorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.heading,
  },
  collectorDesc: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: theme.spacing[1],
  },
  collectorStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[2],
  },
  collectorStatText: {
    fontSize: 12,
    color: colors.text.muted,
    marginLeft: theme.spacing[1],
  },
  viewGarageButton: {
    marginTop: theme.spacing[2],
  },
  viewGarageButtonText: {
    fontSize: 13,
    color: colors.text.heading,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1.5],
    alignSelf: 'flex-start',
  },
  collectorProducts: {
    marginTop: theme.spacing[2],
  },
  bestSellersSection: {
    backgroundColor: colors.primary[600]!,
    paddingVertical: theme.spacing[6],
    borderRadius: theme.radius.none,
  },
  productsScroll: {
    paddingLeft: theme.spacing[4],
  },
  productCardWrapper: {
    width: CARD_WIDTH * 0.9,
    marginRight: theme.spacing[3.5],
  },
  productCard: {
    marginRight: theme.spacing[0],
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: theme.radius['3xl'],
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
  },
  productImage: {
    width: '100%',
    height: POPULAR_RAIL_IMAGE_HEIGHT,
    backgroundColor: colors.gray[200],
  },
  topLeftStack: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: theme.spacing[1.5],
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: 5,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
  },
  likesContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlay.white95,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.xl,
  },
  likesText: {
    fontSize: 12,
    color: colors.text.muted,
    marginLeft: theme.spacing[1],
    fontWeight: '500',
  },
  productContent: {
    padding: theme.spacing[3.5],
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.heading,
    marginBottom: theme.spacing[1.5],
    lineHeight: 20,
  },
  productMeta: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: theme.spacing[2],
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[700]!,
  },
  companyDetails: {
    flex: 1,
    marginLeft: theme.spacing[3],
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.heading,
  },
  companyDesc: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: theme.spacing[1],
  },
  companyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[2],
    gap: theme.spacing[4],
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: colors.text.muted,
    marginLeft: theme.spacing[1],
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 12,
    color: colors.info[600]!,
    marginLeft: theme.spacing[1],
  },
  companyProducts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  companyProductItem: {
    width: '48%',
    marginBottom: theme.spacing[3],
  },
  categoryCount: {
    fontSize: 10,
    color: colors.text.muted,
    marginTop: theme.spacing[0.5],
  },
  // Loading / empty / content dalları bu ortak minHeight'i paylaşır
  // (bkz. POPULAR_RAIL_MIN_HEIGHT türetmesi), böylece raf duruma göre
  // büyüyüp küçülmez.
  popularRailContent: {
    minHeight: POPULAR_RAIL_MIN_HEIGHT,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.overlay.white90,
    marginTop: theme.spacing[3.5],
    fontSize: 15,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.overlay.white90,
    marginTop: theme.spacing[3.5],
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtext: {
    color: colors.overlay.white70,
    marginTop: theme.spacing[1.5],
    fontSize: 14,
  },
  // Yükleme sırasında rezerve edilen bölüm yer tutucuları — her biri kendi
  // MIN_HEIGHT sabitini kullanır (bkz. yukarıdaki türetmeler), böylece veri
  // gelene kadar bölüm görünmez ama boyutu zaten yerindedir.
  categoriesSectionReserved: {
    minHeight: CATEGORIES_SECTION_MIN_HEIGHT,
  },
  featuredCollectorSectionReserved: {
    minHeight: FEATURED_COLLECTOR_SECTION_MIN_HEIGHT,
  },
  boostedRailReserved: {
    minHeight: BOOSTED_RAIL_MIN_HEIGHT,
  },
  productsGridReserved: {
    minHeight: PRODUCTS_GRID_MIN_HEIGHT,
  },
  collectionsSectionReserved: {
    minHeight: COLLECTIONS_SECTION_MIN_HEIGHT,
  },
  companyOfWeekSectionReserved: {
    minHeight: COMPANY_OF_WEEK_SECTION_MIN_HEIGHT,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing[3],
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: theme.spacing[3.5],
  },
  collectionCard: {
    width: 170,
    marginRight: theme.spacing[3.5],
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: theme.radius['3xl'],
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  collectionImage: {
    width: '100%',
    height: 110,
    backgroundColor: colors.gray[200],
  },
  collectionInfo: {
    padding: theme.spacing[3],
  },
  collectionName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.heading,
  },
  collectionMeta: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: theme.spacing[1],
  },
  featuredCard: {
    backgroundColor: colors.surface.DEFAULT,
    marginHorizontal: theme.spacing[4],
    borderRadius: 20,
    padding: 18,
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[200]!,
  },
  featuredHeader: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  featuredAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary[600]!,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary[200]!,
  },
  featuredAvatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.white,
  },
  featuredInfo: {
    flex: 1,
    marginLeft: theme.spacing[3.5],
    justifyContent: 'center',
  },
  featuredName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.heading,
  },
  featuredDesc: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: theme.spacing[1],
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[2],
    backgroundColor: colors.primary[50]!,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.xl,
  },
  featuredStatText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[600]!,
    marginLeft: theme.spacing[1],
  },
  featuredProducts: {
    marginBottom: theme.spacing[3.5],
  },
  featuredProductCard: {
    width: 140,
    marginRight: theme.spacing[3],
    backgroundColor: colors.surface.alt,
    borderRadius: 14,
    overflow: 'hidden',
  },
  featuredProductImage: {
    width: '100%',
    height: 110,
    backgroundColor: colors.gray[200],
  },
  featuredProductTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.heading,
    padding: theme.spacing[2.5],
    paddingBottom: theme.spacing[1],
  },
  featuredProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary[700]!,
    paddingHorizontal: theme.spacing[2.5],
    paddingBottom: theme.spacing[2.5],
  },
  viewGarageBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[50]!,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2.5],
    borderRadius: theme.radius['2xl'],
  },
  viewGarageBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[600]!,
  },
  companyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[1.5],
    gap: theme.spacing[3],
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.heading,
    marginLeft: theme.spacing[1],
  },
  verifiedBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadgeSmallText: {
    fontSize: 12,
    color: colors.success[600]!,
    marginLeft: theme.spacing[1],
  },
  // Logo styles
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 130,
    height: 42,
    marginRight: theme.spacing[1],
  },
  // Company Section styles - Modern design
  companySection: {
    backgroundColor: colors.primary[50]!,
    paddingVertical: theme.spacing[6],
    marginBottom: theme.spacing[6],
  },
  businessBadge: {
    backgroundColor: colors.primary[600]!,
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: theme.spacing[2.5],
  },
  businessBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
  },
  companyCard: {
    backgroundColor: colors.white,
    marginHorizontal: theme.spacing[4],
    borderRadius: 20,
    padding: theme.spacing[5],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.primary[200]!,
  },
  companyHeader: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  companyAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: colors.primary[200]!,
  },
  companyAvatarGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary[200]!,
  },
  companyAvatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
  },
  companyInfo: {
    flex: 1,
    marginLeft: theme.spacing[3.5],
    justifyContent: 'center',
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  companyNameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.heading,
  },
  companyBio: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: theme.spacing[1.5],
    lineHeight: 18,
  },
  companyStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2.5],
    marginBottom: theme.spacing[4],
  },
  companyStat: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: theme.spacing[3],
    alignItems: 'center',
  },
  companyStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  companyStatLabel: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: theme.spacing[1],
    fontWeight: '500',
  },
  companyRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3.5],
    backgroundColor: colors.warning[50]!,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.radius['2xl'],
  },
  companyRatingValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.heading,
    marginLeft: theme.spacing[1.5],
  },
  companyRatingCount: {
    fontSize: 13,
    color: colors.text.muted,
    marginLeft: theme.spacing[1.5],
  },
  companySectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text.heading,
    marginBottom: theme.spacing[3.5],
    marginTop: theme.spacing[3],
  },
  companyProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2.5],
  },
  companyProductCard: {
    width: '31%',
    backgroundColor: colors.surface.alt,
    borderRadius: 14,
    overflow: 'hidden',
  },
  companyProductImage: {
    width: '100%',
    height: 85,
    backgroundColor: colors.gray[200],
  },
  companyProductLikes: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlay.white95,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 3,
    borderRadius: theme.radius.lg,
  },
  companyProductLikesText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
    color: colors.primary[600]!,
  },
  companyProductInfo: {
    padding: theme.spacing[2.5],
  },
  companyProductTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.heading,
    marginBottom: theme.spacing[1.5],
    lineHeight: 16,
  },
  companyProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary[700]!,
  },
  companyCollectionCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.alt,
    borderRadius: 14,
    padding: theme.spacing[3.5],
    marginBottom: theme.spacing[2.5],
    alignItems: 'center',
  },
  companyCollectionImage: {
    width: 60,
    height: 60,
    borderRadius: theme.radius['2xl'],
    backgroundColor: colors.gray[200],
  },
  companyCollectionImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: theme.radius['2xl'],
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyCollectionInfo: {
    flex: 1,
    marginLeft: theme.spacing[3.5],
  },
  companyCollectionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.heading,
  },
  companyCollectionMeta: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: theme.spacing[1],
  },
  companyCollectionStats: {
    flexDirection: 'row',
    gap: theme.spacing[3.5],
    marginTop: theme.spacing[1.5],
  },
  companyCollectionStatText: {
    fontSize: 12,
    color: colors.info[600]!,
    fontWeight: '500',
  },
  companyCollectionStatTextRed: {
    fontSize: 12,
    color: colors.danger[600]!,
    fontWeight: '500',
  },
  viewStoreButton: {
    marginTop: 18,
  },
  viewStoreButtonGradient: {
    paddingVertical: theme.spacing[3.5],
    borderRadius: 12,
    alignItems: 'center',
  },
  viewStoreButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
  },
});
