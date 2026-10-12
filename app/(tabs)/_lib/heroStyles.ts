import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radius } = theme;

/** Hero görsel oranı — web mobil görünümüyle aynı (16/10). */
export const HERO_IMAGE_RATIO = 16 / 10;
/** Yükleme sırasında hero için ayrılan yükseklik (akış kayması olmasın). */
export const HERO_RESERVED_HEIGHT = 380;

export const heroStyles = StyleSheet.create({
  reserved: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    height: HERO_RESERVED_HEIGHT,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.alt,
  },
  shell: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: HERO_IMAGE_RATIO, backgroundColor: colors.surface.alt },
  body: { padding: spacing[4], gap: spacing[2] },
  title: { textAlign: 'left' },
  buttons: { gap: spacing[2], marginTop: spacing[2] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing[2], paddingBottom: spacing[3] },
  dot: { height: 8, width: 8, borderRadius: radius.full, backgroundColor: colors.border.strong },
  dotActive: { width: 24, backgroundColor: colors.primary[500] },
});

export const badgeStyles = StyleSheet.create({
  section: { paddingHorizontal: spacing[4], marginBottom: spacing[4] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  // 3 sütun: (100% - 2 boşluk) / 3 — gap flexWrap ile birlikte yüzdeyle taşmasın diye hesaplanır.
  item: {
    flexGrow: 1,
    flexBasis: '30%',
    maxWidth: '33%',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  icon: { marginBottom: spacing[1] },
});
