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
    padding: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text.heading,
    marginBottom: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
  contactMethods: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
    marginBottom: theme.spacing[6],
  },
  contactMethod: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  contactMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50]!,
    justifyContent: "center",
    alignItems: "center",
  },
  contactMethodContent: {
    flex: 1,
    marginLeft: theme.spacing[4],
  },
  contactMethodTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.heading,
  },
  contactMethodValue: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: theme.spacing[0.5],
  },
  formCard: {
    backgroundColor: colors.surface.DEFAULT,
    marginBottom: theme.spacing[6],
  },
  input: {
    marginBottom: theme.spacing[3],
    backgroundColor: colors.surface.DEFAULT,
  },
  submitButton: {
    borderRadius: 12,
    marginTop: theme.spacing[2],
  },
  hoursCard: {
    backgroundColor: colors.surface.DEFAULT,
    marginBottom: theme.spacing[6],
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing[3],
  },
  hoursDay: {
    fontSize: 14,
    color: colors.text.heading,
  },
  hoursTime: {
    fontSize: 14,
    color: colors.success[600]!,
    fontWeight: "500",
  },
  hoursClosed: {
    fontSize: 14,
    color: colors.danger[600]!,
    fontWeight: "500",
  },
  faqLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.DEFAULT,
    padding: theme.spacing[4],
    borderRadius: 12,
  },
  faqLinkText: {
    flex: 1,
    marginLeft: theme.spacing[3],
    fontSize: 15,
    color: colors.primary[600]!,
    fontWeight: "500",
  },
});
