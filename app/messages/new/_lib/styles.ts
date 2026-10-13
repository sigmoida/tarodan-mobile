import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Route-local stylesheet (§12) — bölümler SectionCard, token'lı.
export const styles = StyleSheet.create({
  recipientSection: {
    gap: spacing[2],
  },
  loadingContainer: {
    padding: spacing[4],
    alignItems: 'center',
  },
  searchResults: {
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.minTouchTarget,
    padding: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  userInfo: {
    marginLeft: spacing[3],
  },
  noResults: {
    marginTop: spacing[2],
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientName: {
    flex: 1,
    marginLeft: spacing[3],
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: theme.minTouchTarget,
  },
  productTitle: {
    flex: 1,
  },
  charCount: {
    marginTop: spacing[2],
  },
});
