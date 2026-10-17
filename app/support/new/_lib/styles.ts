import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { spacing } = theme;

// Yeni destek talebi route-local stilleri: yalnız yerleşim boşlukları.
export const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  userInfo: {
    gap: spacing[1],
  },
});
