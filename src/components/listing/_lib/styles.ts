import { StyleSheet, Platform } from 'react-native';
import { PAGE_SECTION_GAP, theme } from '@/ui';

const { colors, typography } = theme;

// ---------------------------------------------------------------------------
// ListingForm — ekran iskeleti + seçici modalı (`PickerModal`) stilleri. Bölüm stilleri
// kendi dosyalarında (`_sections/*`), hepsi `@/ui` primitiflerinden.
// ---------------------------------------------------------------------------
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  fill: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[10],
    gap: PAGE_SECTION_GAP,
  },
  // Modal (PickerModal — seçici sayfası taşınınca bu blok onunla gider)
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.black50,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.heading,
  },
  modalClose: {
    fontSize: typography.fontSize.xl,
    color: colors.text.subtle,
    fontWeight: typography.fontWeight.semibold,
  },
  modalSearch: {
    marginHorizontal: theme.spacing[5],
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[2],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: theme.radius['2xl'],
    paddingHorizontal: theme.spacing[3.5],
    paddingVertical: theme.spacing[2.5],
    fontSize: typography.fontSize.base,
    color: colors.text.heading,
    backgroundColor: colors.surface.alt,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3.5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  modalItemSelected: {
    backgroundColor: colors.primary[50]!,
  },
  modalItemText: {
    fontSize: typography.fontSize.base,
    color: colors.text.heading,
  },
  modalItemTextSelected: {
    color: colors.primary[600]!,
    fontWeight: typography.fontWeight.semibold,
  },
  checkMark: {
    fontSize: typography.fontSize.base,
    color: colors.primary[600]!,
    fontWeight: typography.fontWeight.bold,
  },
});
