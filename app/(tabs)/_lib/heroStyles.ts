import { StyleSheet } from 'react-native';
import { theme } from '@/ui';
import { HERO_BODY_MIN_HEIGHT, HERO_BORDER_WIDTH, HERO_DOTS_HEIGHT, HERO_IMAGE_RATIO } from './heroLayout';

const { colors, spacing, radius } = theme;


export const heroStyles = StyleSheet.create({
  reserved: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    // Yükseklik genişlikten hesaplanır (`heroReservedHeight`) — HeroSection satır içi verir.
    borderRadius: radius.xl,
    backgroundColor: colors.surface.alt,
  },
  shell: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: radius.xl,
    borderWidth: HERO_BORDER_WIDTH,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: HERO_IMAGE_RATIO, backgroundColor: colors.surface.alt },
  body: { padding: spacing[4], gap: spacing[2], minHeight: HERO_BODY_MIN_HEIGHT },
  title: { textAlign: 'left' },
  buttons: { gap: spacing[2], marginTop: spacing[2] },
  dots: {
    height: HERO_DOTS_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: spacing[2],
    paddingBottom: spacing[3],
  },
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
