import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

export const styles = StyleSheet.create({
  hint: {
    marginBottom: theme.spacing[3],
  },
  input: {
    marginBottom: theme.spacing[3],
  },
  deleteButton: {
    marginTop: theme.spacing[2],
  },
  summary: {
    marginBottom: theme.spacing[3],
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  summaryIban: {
    flex: 1,
  },
  summaryDate: {
    marginTop: theme.spacing[1],
  },
});
