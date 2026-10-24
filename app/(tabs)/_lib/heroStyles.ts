import { StyleSheet } from 'react-native';
import { theme } from '@/ui';
import {
  HERO_BODY_MIN_HEIGHT,
  HERO_BORDER_WIDTH,
  HERO_DOTS_HEIGHT,
  HERO_IMAGE_RATIO,
  HERO_MARGIN_X,
  HERO_SPLIT_IMAGE_RATIO,
} from './heroLayout';
import { HOME_SECTION_GAP } from './homeLayout';

/** Hero kabuğunun dış boşluğu: üst bardan ve yanlardan bölümlerle aynı; alttaki boşluğu bölümler verir. */
const heroOuter = { marginTop: HOME_SECTION_GAP, marginHorizontal: HERO_MARGIN_X } as const;

const { colors, spacing, radius } = theme;


export const heroStyles = StyleSheet.create({
  reserved: {
    ...heroOuter,
    // Yükseklik genişlikten hesaplanır (`heroReservedHeight`) — HeroReserved satır içi verir.
    borderRadius: radius.xl,
    backgroundColor: colors.surface.alt,
  },
  shell: {
    ...heroOuter,
    borderRadius: radius.xl,
    borderWidth: HERO_BORDER_WIDTH,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: HERO_IMAGE_RATIO, backgroundColor: colors.surface.alt },
  body: { padding: spacing[4], gap: spacing[2], minHeight: HERO_BODY_MIN_HEIGHT },
  // Tablet: image beside the text (`imageSide`), text centred vertically next to it.
  splitRow: { flexDirection: 'row', alignItems: 'center' },
  splitRowImageRight: { flexDirection: 'row-reverse' },
  splitImage: { aspectRatio: HERO_SPLIT_IMAGE_RATIO, backgroundColor: colors.surface.alt },
  splitBody: { flex: 1, justifyContent: 'center' },
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
