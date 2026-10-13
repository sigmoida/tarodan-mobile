// Checkout tek sayfa düzeni — web CheckoutClient'ın telefon görünümü (SectionCard'lar alt alta).
import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radius } = theme;

export const styles = StyleSheet.create({
  // --- Sipariş kalemleri (web OrderItemsCard) ---
  noticeBox: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning[200]!,
    backgroundColor: colors.warning[50]!,
  },
  itemList: { gap: spacing[3] },
  item: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  itemImage: {
    width: spacing[16],
    height: spacing[16],
    borderRadius: radius.DEFAULT,
    backgroundColor: colors.surface.alt,
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemPrice: { alignItems: 'flex-end' },

  // --- Adres kartları (web AddressStep) ---
  stack: { gap: spacing[3] },
  field: { marginBottom: spacing[3] },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radius.DEFAULT,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
  },
  addressCardActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50]!,
  },
  addressCardBody: { flex: 1, minWidth: 0 },
  addressForm: { marginTop: spacing[1] },
  billing: {
    marginTop: spacing[6],
    paddingTop: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    gap: spacing[3],
  },
  billingForm: {
    marginTop: spacing[1],
    padding: spacing[4],
    borderRadius: radius.DEFAULT,
    backgroundColor: colors.surface.alt,
  },
  guestDivider: {
    marginTop: spacing[1],
    marginBottom: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  link: { alignSelf: 'flex-start', marginTop: spacing[1] },

  // --- Özet (web OrderSummarySidebar + OrderSummaryLines) ---
  lines: { gap: spacing[3] },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  rule: { height: 1, backgroundColor: colors.border.DEFAULT },
  consent: {
    marginTop: spacing[5],
    paddingTop: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  couponSpacer: { marginBottom: spacing[4] },

  // --- Sabit alt bar ---
  payBar: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  payBarTotal: { minWidth: 0, flexShrink: 1 },
  payBarButton: { flex: 1 },
});
