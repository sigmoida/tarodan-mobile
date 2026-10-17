import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

export const styles = StyleSheet.create({
  filterSection: { gap: theme.spacing[3] },
  // flexGrow:0 → yatay ScrollView dikeyde alan doldurup çipleri germesin.
  scaleScroll: { flexGrow: 0 },
  scaleChips: { gap: theme.spacing[2], alignItems: 'center' },
});
