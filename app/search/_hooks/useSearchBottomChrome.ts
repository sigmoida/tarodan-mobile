import { useMemo } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { FAB_SIZE_SM, theme } from '@/ui';
import { useTabBarTop } from '@/components/shell/tabBarLayout';
import { styles } from '../_lib/searchStyles';

const { spacing } = theme;

/**
 * Bottom chrome of the search results: the floating tab bar (`withStackTabBar`) owns the bottom edge,
 * so the scroll-to-top FAB floats just above it (never over the "+" button) and the list keeps
 * enough bottom padding for the last row to clear the FAB at the end of the scroll.
 */
export function useSearchBottomChrome(): { listBottomInset: number; scrollTopFabStyle: ViewStyle } {
  const tabBarTop = useTabBarTop();
  const fabBottom = tabBarTop + spacing[2];
  const listBottomInset = fabBottom + FAB_SIZE_SM + spacing[2];
  const scrollTopFabStyle = useMemo<ViewStyle>(
    () => ({ ...StyleSheet.flatten(styles.scrollTopFab), bottom: fabBottom }),
    [fabBottom],
  );
  return { listBottomInset, scrollTopFabStyle };
}
