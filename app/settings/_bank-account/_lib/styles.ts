import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors } = theme;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.alt,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
  },
  card: {
    marginTop: theme.spacing[4],
    padding: theme.spacing[4],
    backgroundColor: colors.surface.DEFAULT,
  },
  hint: {
    color: colors.text.muted,
    marginBottom: theme.spacing[3],
  },
  input: {
    marginBottom: theme.spacing[3],
  },
  updateWarning: {
    color: colors.text.muted,
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  submitButton: {
    marginTop: theme.spacing[4],
  },
  deleteButton: {
    marginTop: theme.spacing[2],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[4],
  },
});
