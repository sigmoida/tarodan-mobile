import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { RawText } from './Text';
import { androidRipple, rippleClip, showPressedStyle } from '../lib/pressableFeedback';

export interface SegmentedOption<V extends string = string> {
  value: V;
  label: string;
}

export interface SegmentedButtonsProps<V extends string = string> {
  value: V;
  onValueChange: (value: V) => void;
  options: SegmentedOption<V>[];
  density?: 'small' | 'medium';
  style?: ViewStyle;
}

const { colors, radius, spacing, typography } = theme;

export function SegmentedButtons<V extends string = string>({
  value,
  onValueChange,
  options,
  density = 'medium',
  style,
}: SegmentedButtonsProps<V>) {
  // Asgari yükseklik: büyük yazı ölçeğinde (en çok `maxFontScale.control`) satır büyür, etiket kırpılmaz.
  const height = density === 'small' ? 36 : 44;
  const fontSize = density === 'small' ? typography.fontSize.sm : typography.fontSize.base;

  return (
    <View
      style={[
        styles.row,
        { minHeight: height, borderRadius: radius.lg, borderColor: colors.border.DEFAULT },
        style,
      ]}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        const isFirst = i === 0;
        const isLast = i === options.length - 1;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onValueChange(opt.value)}
            android_ripple={androidRipple({ tone: selected ? 'onDark' : 'onLight' })}
            style={({ pressed }) => [
              styles.segment,
              rippleClip(),
              {
                backgroundColor: selected ? colors.primary[600]! : colors.surface.DEFAULT,
                opacity: showPressedStyle(pressed) ? 0.85 : 1,
                borderTopLeftRadius: isFirst ? radius.lg - 1 : 0,
                borderBottomLeftRadius: isFirst ? radius.lg - 1 : 0,
                borderTopRightRadius: isLast ? radius.lg - 1 : 0,
                borderBottomRightRadius: isLast ? radius.lg - 1 : 0,
                borderRightWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                borderRightColor: colors.border.DEFAULT,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <RawText
              style={{
                color: selected ? colors.white : colors.text.heading,
                fontSize,
                fontWeight: '600',
              }}
              numberOfLines={1}
              maxFontSizeMultiplier={typography.maxFontScale.control}
            >
              {opt.label}
            </RawText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
});
