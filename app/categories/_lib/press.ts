import type { ViewStyle } from 'react-native';
import { showPressedStyle } from '@/ui';

const PRESSED: ViewStyle = { opacity: 0.85 };

/**
 * Basılı geri bildirim stili — bu ekrandaki TÜM dokunulabilir kutular için tek kaynak (iOS hafif
 * opaklık; Android'de ripple verildiği için stil yok — `@/ui` `showPressedStyle`). Ripple ayrıca
 * `android_ripple={androidRipple()}` + `rippleClip()` ile verilir.
 */
export const pressedStyle = (pressed: boolean): ViewStyle | undefined =>
  showPressedStyle(pressed) ? PRESSED : undefined;
