import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { spacing } = theme;

// Route-local stylesheet — bölümler SectionCard, satırlar token'lı.
export const styles = StyleSheet.create({
  divider: {
    marginVertical: spacing[2],
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  settingContent: {
    flex: 1,
    marginRight: spacing[3],
  },
  settingDescription: {
    marginTop: spacing[0.5],
  },
});
