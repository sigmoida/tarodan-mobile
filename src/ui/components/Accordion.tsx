import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { theme } from '../lib/theme';
import { androidRipple, pressedStyle, rippleClip, showPressedStyle } from '../lib/pressableFeedback';
import { Icon } from '../icons';
import { Text } from './Text';

const { colors, duration, iconSize, minTouchTarget, spacing } = theme;

/** `motion.easing.premium` (cubic-bezier(0.4, 0, 0.2, 1)), the curve BottomSheet uses too. */
const EASING = Easing.bezier(0.4, 0, 0.2, 1);

type AccordionSingleProps = {
  type: 'single';
  /** A second press on the open item closes it (web `collapsible`). Without it one item stays open. */
  collapsible?: boolean;
  /** Controlled open item; `''` means none. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

type AccordionMultipleProps = {
  type: 'multiple';
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

export type AccordionProps = (AccordionSingleProps | AccordionMultipleProps) & {
  children?: React.ReactNode;
};

type RootContextValue = {
  openValues: readonly string[];
  toggle: (itemValue: string) => void;
  /**
   * Last measured content height per item. A list that unmounts an open row (FlatList
   * windowing) remounts it at that height instead of drawing it collapsed for a frame.
   */
  heights: Map<string, number>;
};

type ItemContextValue = {
  open: boolean;
  /** Content stays mounted while the close animation runs, then unmounts. */
  mounted: boolean;
  /** 0 = closed, 1 = open; drives the content height/opacity and the chevron. */
  progress: SharedValue<number>;
  toggle: () => void;
  heightOf: () => number;
  rememberHeight: (height: number) => void;
};

const RootContext = createContext<RootContextValue | null>(null);
const ItemContext = createContext<ItemContextValue | null>(null);

function useRequiredContext<T>(context: React.Context<T | null>, name: string): T {
  const value = useContext(context);
  if (!value) throw new Error(`${name} must be rendered inside its Accordion parent`);
  return value;
}

const toArray = (value: string | string[] | undefined): string[] =>
  value === undefined || value === '' ? [] : Array.isArray(value) ? value : [value];

/**
 * Accordion: collapsible sections with an animated height (web `@tarodan/ui` Accordion, Radix).
 * Compose `Accordion > AccordionItem > (AccordionTrigger + AccordionContent)`. `type="single"`
 * keeps one item open at a time; `type="multiple"` lets several stay open.
 *
 * Unlike the web root it draws no box of its own (it only provides state), so it can wrap a
 * `FlatList` whose rows are the items.
 */
export function Accordion(props: AccordionProps) {
  const isControlled = props.value !== undefined;
  const [uncontrolled, setUncontrolled] = useState<string[]>(() => toArray(props.defaultValue));
  const openValues = useMemo(
    () => (isControlled ? toArray(props.value) : uncontrolled),
    [isControlled, props.value, uncontrolled],
  );

  // `toggle` stays stable and reads the committed props and open values from this ref (updated
  // after commit, so a discarded render never leaks into it).
  const latest = useRef({ props, openValues, isControlled });
  useLayoutEffect(() => {
    latest.current = { props, openValues, isControlled };
  });
  const heights = useRef(new Map<string, number>()).current;

  const toggle = useCallback((itemValue: string) => {
    const { props: p, openValues: current, isControlled: controlled } = latest.current;
    const isOpen = current.includes(itemValue);
    let next: string[];
    if (p.type === 'single') {
      if (isOpen && !p.collapsible) return;
      next = isOpen ? [] : [itemValue];
      p.onValueChange?.(next[0] ?? '');
    } else {
      next = isOpen ? current.filter((v) => v !== itemValue) : [...current, itemValue];
      p.onValueChange?.(next);
    }
    if (!controlled) setUncontrolled(next);
  }, []);

  const ctx = useMemo(() => ({ openValues, toggle, heights }), [openValues, toggle, heights]);
  return <RootContext.Provider value={ctx}>{props.children}</RootContext.Provider>;
}

export interface AccordionItemProps {
  /** Unique id of the item inside its Accordion. */
  value: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** One section. Draws no border of its own: put it in a `ListRowCard` / `SectionCard` or add a `Divider`. */
export function AccordionItem({ value, children, style, testID }: AccordionItemProps) {
  const root = useRequiredContext(RootContext, 'AccordionItem');
  const open = root.openValues.includes(value);
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(open ? 1 : 0);
  // Set during render (not in the effect) so the content is still mounted in the very commit that
  // closes the item; otherwise it would unmount for a frame and the close animation would be lost.
  const [prevOpen, setPrevOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setClosing(!open && !reduceMotion);
  }

  const animatedOpen = useRef(open);
  useEffect(() => {
    if (animatedOpen.current === open) return;
    animatedOpen.current = open;
    const target = open ? 1 : 0;
    if (reduceMotion) {
      progress.value = target;
      return;
    }
    progress.value = withTiming(target, { duration: duration.normal, easing: EASING }, (finished) => {
      // A re-open cancels this animation (finished = false), so the content stays mounted.
      if (finished && target === 0) scheduleOnRN(setClosing, false);
    });
  }, [open, reduceMotion, progress]);

  const { toggle: rootToggle, heights } = root;
  const toggle = useCallback(() => rootToggle(value), [rootToggle, value]);
  const heightOf = useCallback(() => heights.get(value) ?? 0, [heights, value]);
  const rememberHeight = useCallback((h: number) => heights.set(value, h), [heights, value]);
  const mounted = open || closing;
  const ctx = useMemo(
    () => ({ open, mounted, progress, toggle, heightOf, rememberHeight }),
    [open, mounted, progress, toggle, heightOf, rememberHeight],
  );

  return (
    <ItemContext.Provider value={ctx}>
      <View style={style} testID={testID}>
        {children}
      </View>
    </ItemContext.Provider>
  );
}

export interface AccordionTriggerProps extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  /** A string is drawn as the web trigger text (sm, semibold, heading); anything else as is. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The pressable header row: content on the left, a chevron on the right that turns 180 degrees
 * when open. At least 44 pt high, `button` role with `accessibilityState.expanded`.
 */
export function AccordionTrigger({ children, style, ...rest }: AccordionTriggerProps) {
  const item = useRequiredContext(ItemContext, 'AccordionTrigger');
  const { progress } = item;
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ ...rest.accessibilityState, expanded: item.open }}
      onPress={item.toggle}
      android_ripple={androidRipple()}
      style={({ pressed }) => [styles.trigger, rippleClip(), showPressedStyle(pressed) && pressedStyle, style]}
    >
      <View style={styles.triggerBody}>
        {typeof children === 'string' ? <Text variant="label">{children}</Text> : children}
      </View>
      <Animated.View style={chevronStyle}>
        <Icon name="chevron-down" size={iconSize.sm} color={colors.text.muted} />
      </Animated.View>
    </Pressable>
  );
}

export interface AccordionContentProps {
  children?: React.ReactNode;
  /** Inner padding box (default web `px-4 pt-2 pb-6`). */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The collapsible body. Mounted only while open (and during the close animation); height and
 * opacity follow the trigger. Reduce motion on: it opens and closes without animation.
 */
export function AccordionContent({ children, style, testID }: AccordionContentProps) {
  const item = useRequiredContext(ItemContext, 'AccordionContent');
  const { progress, rememberHeight } = item;
  const height = useSharedValue(item.heightOf());
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value * progress.value,
    opacity: progress.value,
  }));
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      height.value = e.nativeEvent.layout.height;
      rememberHeight(e.nativeEvent.layout.height);
    },
    [height, rememberHeight],
  );

  if (!item.mounted) return null;
  return (
    <Animated.View
      style={[styles.clip, animatedStyle]}
      // While it closes the content is still drawn but no longer part of the page.
      accessibilityElementsHidden={!item.open}
      importantForAccessibility={item.open ? 'auto' : 'no-hide-descendants'}
      testID={testID}
    >
      <View style={styles.measure} onLayout={onLayout}>
        <View style={[styles.content, style]}>{children}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    minHeight: minTouchTarget,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  triggerBody: {
    flex: 1,
  },
  clip: {
    overflow: 'hidden',
  },
  // Laid out at its natural height while the clip box animates from 0 to that height.
  measure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
  },
});
