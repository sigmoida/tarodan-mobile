import React, { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Router from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CountBadge, theme } from '@/ui';
import { useShellCounts } from './useShellCounts';

const { colors, spacing, radius, iconSize, shadow } = theme;

const logoSource = require('../../../assets/tarodan-logo.png');
/** tarodan-logo.png oranı 2788 × 688. Web: `max-h-8 max-w-[104px]`. */
const LOGO_WIDTH = 104;
const LOGO_HEIGHT = Math.round(LOGO_WIDTH * (688 / 2788));
/** Web: yalnız-ikon düğmeler h-9 w-9, ikon 24. */
const ACTION_BOX = 36;

export interface AppShellAction {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  count?: number;
  testID?: string;
}

export interface AppShellProps {
  children?: React.ReactNode;
  /** Logo satırının altında tam genişlik satır (ana sayfa: arama). */
  search?: React.ReactNode;
  /**
   * Sağdaki ikonlar. Verilmezse web Header'ın telefon kümesi: bildirimler + sepet (sayaçlı).
   * Hesap ve "ilan ver" sekme çubuğunda (platform kalıbı) olduğu için burada yok.
   */
  actions?: AppShellAction[];
  /** İçerik kabına ek stil. */
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const noopFocusEffect = (_cb: () => void | (() => void)) => undefined;

/**
 * Sekme köklerinin kabuğu — web Header'ın telefon görünümü: primary-500 marka barı
 * (alt kenarlık primary-600, hafif gölge), solda logo, sağda ikonlar; opsiyonel tam genişlik
 * arama satırı. Güvenli alanın üstü de turuncu; odaktayken StatusBar açık içerik.
 */
export const AppShell: React.FC<AppShellProps> = ({
  children,
  search,
  actions,
  contentStyle,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const counts = useShellCounts();

  // Turuncu barda açık içerik; ekrandan çıkınca kök varsayılanına (koyu) dön.
  const useFocus = (Router.useFocusEffect ?? noopFocusEffect) as typeof noopFocusEffect;
  useFocus(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  const items: AppShellAction[] = actions ?? [
    {
      icon: 'notifications-outline',
      label: t('nav.notifications'),
      onPress: () => Router.router.push('/notifications'),
      count: counts.notificationCount,
      testID: 'app-shell-notifications',
    },
    {
      icon: 'cart-outline',
      label: t('nav.cart'),
      onPress: () => Router.router.push('/cart'),
      count: counts.cartCount,
      testID: 'app-shell-cart',
    },
  ];

  return (
    <View style={styles.root} testID={testID}>
      <View style={[styles.bar, { paddingTop: insets.top + spacing[2] }]} testID="app-shell-bar">
        <View style={styles.row}>
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Tarodan"
          />
          <View style={styles.actions}>
            {items.map((a) => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                hitSlop={4}
                testID={a.testID}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              >
                <Ionicons name={a.icon} size={iconSize.lg} color={colors.text.inverted} />
                <CountBadge count={a.count ?? 0} ringColor={colors.primary[500]} />
              </Pressable>
            ))}
          </View>
        </View>
        {search ? <View style={styles.search}>{search}</View> : null}
      </View>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  bar: {
    backgroundColor: colors.primary[500],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[600],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    ...shadow.soft,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ACTION_BOX,
    gap: spacing[2],
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  actions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  action: {
    width: ACTION_BOX,
    height: ACTION_BOX,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    backgroundColor: colors.overlay.white10,
  },
  search: {
    marginTop: spacing[2],
  },
  content: {
    flex: 1,
  },
});
