import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { RawText } from './Text';

import { Icon } from '../icons';
/**
 * Web `@tarodan/ui` Stepper'ın native karşılığı — çok adımlı akışlar (checkout, iade durumu…).
 * Tamamlanan adım ✓, geçerli adım vurgulu, gelecek adımlar soluk; `error` adımı kırmızı ✕.
 * `onStepClick` verilirse adımlar düğme olur (varsayılan yalnız geriye: `i <= current`).
 */
export interface StepperStep {
  label: string;
  /** Daire içeriğini ezer (varsayılan sayı / ✓ / ✕). */
  icon?: React.ReactNode;
  /** Terminal hata adımı (ör. reddedildi/iptal). */
  error?: boolean;
}

export interface StepperProps {
  steps: Array<StepperStep | string>;
  /** Etkin adım (0 tabanlı). */
  current: number;
  onStepClick?: (index: number) => void;
  canClickStep?: (index: number) => boolean;
  style?: StyleProp<ViewStyle>;
}

type StepTone = 'done' | 'active' | 'upcoming' | 'error';
type HalfTone = 'hidden' | 'done' | 'todo';

const { colors, spacing, typography, radius, iconSize } = theme;
const CIRCLE = 32;

const circleTone: Record<StepTone, { bg: string; fg: string; ring?: string }> = {
  done: { bg: colors.primary[600], fg: colors.text.inverted },
  active: { bg: colors.primary[100], fg: colors.primary[700], ring: colors.primary[500] },
  upcoming: { bg: colors.surface.alt, fg: colors.text.muted },
  error: { bg: colors.danger[100], fg: colors.danger[700], ring: colors.danger[400] },
};

const labelColor: Record<StepTone, string> = {
  done: colors.text.muted,
  active: colors.text.heading,
  upcoming: colors.text.muted,
  error: colors.danger[700],
};

const Half: React.FC<{ tone: HalfTone }> = ({ tone }) => (
  <View
    style={[
      styles.half,
      tone === 'hidden' && styles.hidden,
      tone === 'done' && { backgroundColor: colors.primary[600] },
      tone === 'todo' && { backgroundColor: colors.border.DEFAULT },
    ]}
  />
);

export const Stepper: React.FC<StepperProps> = ({
  steps,
  current,
  onStepClick,
  canClickStep,
  style,
}) => {
  const items = steps.map((s) => (typeof s === 'string' ? { label: s } : s));
  return (
    <View style={[styles.row, style]} accessibilityRole="list">
      {items.map((step, i) => {
        const isLast = i === items.length - 1;
        const tone: StepTone = step.error
          ? 'error'
          : i < current
            ? 'done'
            : i === current
              ? 'active'
              : 'upcoming';
        const ct = circleTone[tone];
        const clickable = !!onStepClick && (canClickStep ? canClickStep(i) : i <= current);
        const left: HalfTone = i === 0 ? 'hidden' : i - 1 < current ? 'done' : 'todo';
        const right: HalfTone = isLast ? 'hidden' : i < current ? 'done' : 'todo';
        const icon =
          step.icon ??
          (tone === 'error' ? (
            <Icon name="x-mark" size={iconSize.sm} color={ct.fg} />
          ) : tone === 'done' ? (
            <Icon name="check" size={iconSize.sm} color={ct.fg} />
          ) : (
            <RawText style={[styles.number, { color: ct.fg }]}>{i + 1}</RawText>
          ));
        const body = (
          <>
            <View style={styles.circleRow}>
              <Half tone={left} />
              <View
                style={[
                  styles.circle,
                  { backgroundColor: ct.bg },
                  ct.ring ? { borderWidth: 2, borderColor: ct.ring } : null,
                ]}
              >
                {icon}
              </View>
              <Half tone={right} />
            </View>
            <RawText style={[styles.label, { color: labelColor[tone] }]}>{step.label}</RawText>
          </>
        );
        return clickable ? (
          <Pressable
            key={`${step.label}-${i}`}
            onPress={() => onStepClick!(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: tone === 'active' }}
            style={({ pressed }) => [styles.step, pressed && styles.pressed]}
          >
            {body}
          </Pressable>
        ) : (
          <View
            key={`${step.label}-${i}`}
            style={styles.step}
            accessibilityState={{ selected: tone === 'active' }}
          >
            {body}
          </View>
        );
      })}
    </View>
  );
};

/** Adım indeksi durumu + next/back/goTo — web `useStepper` ile aynı (sınırlar sıkıştırılır). */
export function useStepper(stepCount: number, initial = 0) {
  const [current, setCurrent] = React.useState(initial);
  const goTo = React.useCallback(
    (i: number) => setCurrent(Math.min(stepCount - 1, Math.max(0, i))),
    [stepCount],
  );
  const next = React.useCallback(
    () => setCurrent((c) => Math.min(stepCount - 1, c + 1)),
    [stepCount],
  );
  const back = React.useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
  return {
    current,
    goTo,
    next,
    back,
    isFirst: current === 0,
    isLast: current === stepCount - 1,
  };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  step: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  pressed: { opacity: 0.8 },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  half: {
    flex: 1,
    height: 2,
  },
  hidden: { opacity: 0 },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  label: {
    marginTop: spacing[1.5],
    paddingHorizontal: spacing[1],
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * typography.lineHeight.tight,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
});
