import { StyleSheet, type ViewStyle } from 'react-native';
import type { screen } from '@testing-library/react-native';

/** A rendered element as the RNTL queries return it. */
type ReactTestInstance = ReturnType<typeof screen.getByRole>;

/**
 * The flattened style of a rendered `Pressable` (pass the host from `getByRole` / `getByTestId`).
 * The host carries the style resolved for the current press state, so for `pressed: true` the
 * `({ pressed }) => style` function is read from the `Pressable` above it.
 */
export function pressableStyle(element: ReactTestInstance, pressed = false): ViewStyle {
  if (!pressed) return StyleSheet.flatten(resolve(element.props.style, false)) ?? {};
  let node: ReactTestInstance | null = element;
  while (node && typeof node.props.style !== 'function') node = node.parent;
  if (!node) throw new Error('pressableStyle: no Pressable style function above this element');
  return StyleSheet.flatten(resolve(node.props.style, true)) ?? {};
}

function resolve(style: unknown, pressed: boolean) {
  return typeof style === 'function' ? style({ pressed }) : style;
}
