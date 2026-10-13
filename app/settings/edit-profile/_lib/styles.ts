import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, radius, spacing } = theme;

/** Profil fotoğrafı (yükleme sonrası önizleme) — Avatar `xl` ile aynı çap. */
const AVATAR_SIZE = 80;
/** Fotoğrafın sağ altındaki kamera rozeti. */
const EDIT_BADGE_SIZE = 28;

// Route-local stylesheet (§12) — D1b referans düzeni: token'lar, bölümler SectionCard.
export const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary[600],
    width: EDIT_BADGE_SIZE,
    height: EDIT_BADGE_SIZE,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface.elevated,
  },
  input: {
    marginBottom: spacing[3],
  },
  lastInput: {
    marginBottom: 0,
  },
  links: {
    gap: spacing[2],
  },
  // LegalIdentityCard
  legalDescription: {
    marginBottom: spacing[3],
  },
  legalRow: {
    marginBottom: spacing[3],
    gap: spacing[1],
  },
});
