import { StyleSheet } from "react-native";
import { theme } from "@/ui";

const { colors, spacing, radius, radiusRole, typography, minTouchTarget } = theme;

/** Sohbet görsel ölçüleri (pt). */
const MESSAGE_IMAGE = 160;
const PENDING_THUMB = 56;
const AVATAR_COLUMN = 36;

// Mesaj sohbeti ekranının route-local stylesheet'i — web MessageBubble/ChatHeader dili, token'lı.
export const styles = StyleSheet.create({
  // --- Üst bar (web ChatHeader: beyaz, alt kenarlık, geri + avatar + ad/ürün + menü) ---
  header: {
    backgroundColor: colors.surface.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[2],
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  headerInfo: {
    flex: 1,
  },
  productBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  productBannerText: {
    flex: 1,
  },
  alertWrap: {
    padding: spacing[3],
  },
  loadingContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesListHidden: {
    opacity: 0,
  },
  messagesContent: {
    padding: spacing[4],
  },
  // TypingIndicator görünüp kaybolunca liste footer'ının toplam yüksekliği
  // DEĞİŞMESİN diye sabit yükseklik: göstergenin kendi paddingVertical'i
  // (spacing[2] * 2) + caption satır yüksekliği. Eski 20pt alt boşluğun yerini
  // alır — indikatör gizliyken de aynı boşluğu korur (layout denetimi B3).
  typingIndicatorFooter: {
    height: spacing[2] * 2 + typography.fontSize.xs * typography.lineHeight.normal,
    justifyContent: "flex-end",
  },
  dateDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing[4],
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.DEFAULT,
  },
  dateDividerText: {
    paddingHorizontal: spacing[3],
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: spacing[2],
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  avatarPlaceholder: {
    width: AVATAR_COLUMN,
    marginRight: spacing[2],
  },
  // Web: px-4 py-2.5 rounded-2xl, kendi balonu primary-500 + sağ alt köşe md; karşı taraf
  // surface-elevated + çerçeve + sol alt köşe md.
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: radius["2xl"],
  },
  messageBubbleOwn: {
    backgroundColor: colors.primary[500]!,
    borderBottomRightRadius: radius.md,
  },
  messageBubbleOther: {
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderBottomLeftRadius: radius.md,
  },
  messageImagesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[1.5],
    marginBottom: spacing[1.5],
  },
  messageImage: {
    width: MESSAGE_IMAGE,
    height: MESSAGE_IMAGE,
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.alt,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[1],
    justifyContent: "flex-end",
    gap: spacing[1.5],
  },
  // --- Giriş çubuğu (PageShell footer'ı çerçeve + güvenli alanı verir) ---
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing[2],
  },
  inputWrapper: {
    flex: 1,
  },
  pendingImageBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  pendingImageThumb: {
    width: PENDING_THUMB,
    height: PENDING_THUMB,
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.alt,
  },
  pendingImageText: {
    flex: 1,
  },
});
