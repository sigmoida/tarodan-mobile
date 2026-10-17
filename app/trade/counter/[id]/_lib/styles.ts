import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

// Karşı teklif ekranının route-local stylesheet'i. Kartlar ortak `SectionCard` (beyaz) +
// `TradePickCard`; burada yalnız kart içi düzen.
export const styles = StyleSheet.create({
  pickerSubtitle: {
    marginBottom: theme.spacing[3],
  },
  swapWrap: { alignItems: 'center' },
  summary: { gap: theme.spacing[1] },
  chipsRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    marginTop: theme.spacing[2],
  },
  chip: {
    flex: 1,
  },
  cashInput: {
    marginTop: theme.spacing[3],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[1],
  },
});
