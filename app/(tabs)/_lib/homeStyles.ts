import { StyleSheet } from 'react-native';
import { theme } from '@/ui';
import { HOME_GUTTER, HOME_SECTION_GAP } from './homeLayout';

const { colors, spacing, radiusRole } = theme;

/** Web `w-40`: ray kartı genişliği (160pt). */
const RAIL_CARD_WIDTH = spacing[20] * 2;

// Ana sayfa stilleri (hero ve rozet şeridi kendi `heroStyles` dosyasında).
export const homeStyles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  flex: { flex: 1, minWidth: 0 },
  flexShrink: { flexShrink: 1 },
  pressed: { opacity: 0.85 },
  scroll: { flex: 1 },
  // Bölümler: web PageShell `space-y-4` + `px-4` (tek kaynak `homeLayout`; hero ile aynı kenar).
  sections: { paddingHorizontal: HOME_GUTTER, paddingVertical: HOME_SECTION_GAP, gap: HOME_SECTION_GAP },
  // Reklam yuvaları ana sayfada bölümlerle aynı ritim: üst barın/bölümlerin altından tek
  // `HOME_SECTION_GAP`, yan kenar `HOME_GUTTER`. Hero ve bölümler kendi üst boşluğunu verdiği
  // için header reklamı alt, footer reklamı üst boşluk bırakmaz (çift boşluk olmasın).
  adHeader: { paddingHorizontal: HOME_GUTTER, paddingTop: HOME_SECTION_GAP, paddingBottom: 0 },
  adFooter: { paddingHorizontal: HOME_GUTTER, paddingTop: 0, paddingBottom: HOME_SECTION_GAP },

  // Ürün rayı (web: flex gap-3 overflow-x-auto, kart w-40)
  // Yatay şeritler: flexGrow:0 (dikeyde içerik kadar) + hizalama (kartlar germesin).
  railScroll: { flexGrow: 0 },
  rail: { gap: spacing[3] },
  railCell: { width: RAIL_CARD_WIDTH },

  // Üreticiler şeridi (web: w-24 h-14 kutular, border, rounded, p-2.5)
  brandsScroll: { flexGrow: 0 },
  brandsRow: { gap: spacing[3], paddingVertical: spacing[1], alignItems: 'center' },
  brandTile: {
    width: spacing[24],
    height: spacing[16] - spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[2.5],
    borderRadius: radiusRole.productCard,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  brandLogo: { width: '100%', height: '100%' },

  // En İyi Koleksiyonlar (web: grid-cols-2 gap-4)
  // Cells sized by `gridCellStyle` in `HomeCollections` (47% / 6% on phones).
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing[4] },
  collectionCard: {
    overflow: 'hidden',
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  collectionStrip: { flexDirection: 'row', gap: spacing[0.5], backgroundColor: colors.surface.alt },
  collectionThumb: { flex: 1, aspectRatio: 1, backgroundColor: colors.surface.alt },
  collectionBody: { padding: spacing[3], gap: spacing[1] },
  collectorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },

  // Haftanın Koleksiyoneri / Şirketi
  spotlightHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4], marginBottom: spacing[4] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1] },
  stats: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] },
  stat: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[2],
    borderRadius: radiusRole.productCard,
    backgroundColor: colors.surface.alt,
  },
  statLabel: { textTransform: 'none', letterSpacing: 0 },
  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] },
  thumb: {
    width: '23%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: radiusRole.productCard,
    backgroundColor: colors.surface.alt,
  },
});
