/**
 * Window width classes (pt) and content widths for large screens: iPad, the
 * foldable iPhone, Android tablets and foldables. The classes match the
 * Material window size classes; a class starts at its value here:
 *
 * - `compact`: < `medium` (every phone, the foldable iPhone's outer display)
 * - `medium`: 600 to 839 (foldable iPhone inner display, iPad Air 11" portrait)
 * - `expanded`: 840 to 1199 (iPad 13" portrait, small tablets in landscape)
 * - `large`: >= 1200 (Android tablets in landscape)
 *
 * Compare them with a measured width (`useWindowDimensions`, `onLayout`), never
 * with the device model, so Split View, Stage Manager, folding and resizable
 * Android windows work alike. `@/ui` `windowClassOf` is the one classifier.
 *
 * Pending upstream: tarodan-app `packages/design-tokens` gets the same file
 * (web keeps its Tailwind `screens` for CSS media queries).
 */
export const breakpoints = {
  medium: 600,
  expanded: 840,
  large: 1200,
} as const;

export type Breakpoints = typeof breakpoints;

/** Content widths (pt) that large screens centre content at. */
export const contentWidths = {
  /** Forms, settings and detail pages (web `max-w-2xl`). */
  readable: 672,
} as const;

export type ContentWidths = typeof contentWidths;
