import { StyleSheet } from 'react-native';
import { INBOX_LEADING_SIZE } from '@/components/common/InboxRow';
import { theme } from '@/ui';

const { colors, spacing, radius, radiusRole } = theme;

// Route-local stylesheet (§12) — satır iskeleti ortak `InboxRow`'da; burada yalnız sol kutu içerikleri.
export const styles = StyleSheet.create({
  footerSpinner: { paddingVertical: spacing[4] },
  // Yığın ekranı: alt menü yok; son satır ev göstergesinin üstünde kalsın.
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing[12],
  },
  iconContainer: {
    width: INBOX_LEADING_SIZE,
    height: INBOX_LEADING_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: INBOX_LEADING_SIZE,
    height: INBOX_LEADING_SIZE,
    borderRadius: radiusRole.productCard,
    backgroundColor: colors.surface.alt,
  },
});
