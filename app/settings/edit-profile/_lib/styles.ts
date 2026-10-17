import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, radius, spacing } = theme;

/** Profil fotoğrafı (yükleme sonrası önizleme) — Avatar `xl` ile aynı çap. */
const AVATAR_SIZE = 80;
/** Fotoğrafın sağ altındaki kamera rozeti. */
const EDIT_BADGE_SIZE = 28;

/** Bölüm içi eylem düğmeleri arası boşluk (yatay). */
export const ACTION_GAP = spacing[4];

// Route-local stylesheet (app/CLAUDE.md › Worked examples) — D1b referans düzeni: token'lar, bölümler SectionCard.
export const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
  },
  // Yükleme sürerken fotoğrafın üstünde yarı saydam daire + gösterge.
  avatarUploading: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
    backgroundColor: colors.overlay.black30,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Hesap bölümleri (kullanıcı adı / e-posta): alanlar ve eylem satırları arası boşluk.
  sectionBody: {
    gap: spacing[3],
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
