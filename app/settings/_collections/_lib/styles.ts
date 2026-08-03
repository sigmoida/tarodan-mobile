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
  infoBanner: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: theme.radius["3xl"],
    padding: theme.spacing[5],
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing[5],
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[600]!,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: theme.spacing[4],
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text.heading,
  },
  infoBannerDesc: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: theme.spacing[1],
  },
  collectionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  collectionCard: {
    width: "48%",
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
    marginBottom: theme.spacing[4],
    overflow: "hidden",
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  collectionImage: {
    width: "100%",
    height: 120,
    backgroundColor: colors.surface.alt,
  },
  collectionOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  privateBadge: {
    backgroundColor: colors.overlay.black50,
    padding: theme.spacing[1.5],
    borderRadius: 12,
  },
  collectionInfo: {
    padding: theme.spacing[3],
  },
  collectionName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.heading,
  },
  collectionMeta: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: theme.spacing[1],
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  premiumNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[5],
    borderLeftWidth: 4,
    borderLeftColor: colors.warning[500]!,
  },
  premiumNoticeText: {
    flex: 1,
    marginLeft: theme.spacing[3],
  },
  premiumNoticeTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.heading,
  },
  premiumNoticeDesc: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: theme.spacing[0.5],
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.heading,
    marginTop: theme.spacing[4],
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: theme.spacing[2],
    textAlign: "center",
  },
});
