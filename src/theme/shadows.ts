import { colors } from "./colors";

/** Web (CSS box-shadow) gölge token'ları — `@tarodan/design-tokens` ile aynı. */
export const shadows = {
  soft: '0 2px 8px -2px rgba(0,0,0,0.08)',
  medium: '0 4px 16px -4px rgba(0,0,0,0.12)',
  elevated: '0 8px 30px -8px rgba(0,0,0,0.16)',
  premium: '0 12px 40px -12px rgba(0,0,0,0.2)',
  'inner-soft': 'inset 0 1px 3px 0 rgba(0,0,0,0.06)',
} as const;

export type Shadows = typeof shadows;

export interface NativeShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

/**
 * Aynı gölgelerin RN karşılığı (iOS shadow* + Android elevation). CSS blur ≈ 2 × shadowRadius;
 * negatif spread RN'de yok, opaklık aynı tutuldu. `StyleSheet` içinde yayarak kullanın:
 * `{ ...theme.shadow.soft }`.
 */
export const nativeShadows = {
  none: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  soft: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 15,
    elevation: 8,
  },
} as const satisfies Record<string, NativeShadow>;

export type NativeShadows = typeof nativeShadows;
