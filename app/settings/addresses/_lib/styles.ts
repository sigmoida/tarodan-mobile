import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

/** Form modalının kaydırma alanı üst sınırı (pt). */
const DIALOG_SCROLL_MAX_HEIGHT = 420;

// Adresler ekranının route-local stylesheet'i — D1b referans düzeni (token'lar).
export const styles = StyleSheet.create({
  // SectionCard gövdesi: satırlar arası web `space-y-3`.
  list: {
    gap: spacing[3],
  },
  // Web satırı: `rounded-lg border border-border-subtle p-4`, sağda ikon aksiyonlar.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radiusRole.card,
    padding: spacing[4],
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  addressTitle: {
    flexShrink: 1,
  },
  addressDetail: {
    marginTop: spacing[1],
  },
  defaultButton: {
    marginTop: spacing[2],
  },
  // --- Form modalı (AddressFormModal) ---
  dialogScroll: {
    maxHeight: DIALOG_SCROLL_MAX_HEIGHT,
  },
  input: {
    marginBottom: spacing[3],
  },
});
