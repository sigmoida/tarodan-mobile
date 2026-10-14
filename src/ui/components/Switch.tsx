import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch as RNSwitch,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type SwitchProps as RNSwitchProps,
  type ViewStyle,
} from 'react-native';
import { theme } from '../lib/theme';

export type SwitchSize = 'sm' | 'md';

export interface SwitchProps
  extends Omit<
    RNSwitchProps,
    'trackColor' | 'thumbColor' | 'ios_backgroundColor' | 'style' | 'onValueChange' | 'value'
  > {
  value: boolean;
  onValueChange: (v: boolean) => void;
  /**
   * `sm` (varsayılan) = web Switch genişliği (`w-11` = 44pt): iOS yerel anahtarı ölçülen yerel
   * genişliğe göre 44pt'ye ölçeklenir (iOS < 26 ≈ 51×31, iOS 26 ≈ 64×28). `md` = yerel boy.
   * Android'in Material anahtarı zaten kompakt — ölçeklenmez.
   */
  size?: SwitchSize;
  /** Dış (dokunma) kutusunun stili. */
  style?: StyleProp<ViewStyle>;
}

const { colors, minTouchTarget } = theme;

/** Web Switch genişliği (`w-11`). */
const TARGET_WIDTH = 44;

/** Ölçümden önceki tahmin (ilk karede sıçramayı azaltır); `onLayout` gerçek yerel boyu verir. */
function expectedIosNativeSize() {
  const major = parseInt(String(Platform.Version), 10);
  return major >= 26 ? { width: 64, height: 28 } : { width: 51, height: 31 };
}

/**
 * Tek anahtar primitive'i. Dokunma, ≥44pt'lik dış `Pressable`'da: Fabric'te UISwitch'in kendi isabet
 * testi `hitSlop`'u yok sayar ve ölçek gerçek hedefi de küçültür; bu yüzden iç RN Switch dokunmaya
 * (`pointerEvents="none"`) ve erişilebilirliğe kapalıdır (çift odak yok), rol + durum dış kutuda.
 * Görsel küçültme `transform: scale`; yerleşim kutusu negatif kenar boşluğuyla görsel boya çekilir.
 */
export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled,
  size = 'sm',
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}) => {
  const compact = size === 'sm' && Platform.OS === 'ios';
  const [native, setNative] = React.useState(expectedIosNativeSize);

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setNative((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    }
  }, []);

  const scaleStyle = React.useMemo<ViewStyle | undefined>(() => {
    if (!compact) return undefined;
    const scale = Math.min(1, TARGET_WIDTH / native.width);
    return {
      transform: [{ scale }],
      marginHorizontal: -((native.width * (1 - scale)) / 2),
      marginVertical: -((native.height * (1 - scale)) / 2),
    };
  }, [compact, native]);

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (!disabled) onValueChange(!value);
      }}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={[styles.hit, style]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <RNSwitch
          {...rest}
          testID={testID ? `${testID}-native` : undefined}
          value={value}
          disabled={disabled}
          trackColor={{ false: colors.gray[300], true: colors.primary[600]! }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.gray[300]}
          onLayout={compact ? onLayout : undefined}
          style={scaleStyle}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  hit: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
