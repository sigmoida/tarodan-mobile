import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// İndirim yönetimi ekranının route-local stylesheet'i — web Card dili, token'lı.
export const styles = StyleSheet.create({
  discountCard: {
    gap: spacing[2],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  cardHeaderText: {
    flex: 1,
    gap: spacing[1],
  },
  valueWrap: {
    alignItems: 'flex-end',
  },
  metaRow: {
    gap: spacing[1],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing[2],
    marginTop: spacing[1],
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconActions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[4],
  },
  input: {
    marginBottom: spacing[3],
  },
  dateInput: {
    flex: 1,
  },
  sectionLabel: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  toggleRowWrap: {
    flexWrap: 'wrap',
  },
  productPickerRow: {
    marginBottom: spacing[3],
  },
  fieldError: {
    marginTop: spacing[1],
    marginBottom: spacing[3],
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: theme.minTouchTarget,
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  productRowText: {
    flex: 1,
  },
  codeBadgeWrap: {
    flexDirection: 'row',
  },
  card: {
    borderRadius: radiusRole.card,
  },
});
