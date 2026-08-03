import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors } = theme;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { padding: theme.spacing[4], gap: theme.spacing[3] },
  intro: { marginBottom: theme.spacing[1] },
  center: { paddingVertical: theme.spacing[12], alignItems: "center" },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[3.5],
  },
  cardInfo: { flex: 1, gap: theme.spacing[1] },
  cardTitle: { fontWeight: "600" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing[1.5] },
  badge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 11,
  },
  delete: { padding: theme.spacing[2] },
  secure: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[1.5],
    marginTop: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  secureText: { flexShrink: 1 },
});
