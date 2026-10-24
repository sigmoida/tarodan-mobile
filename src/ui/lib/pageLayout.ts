import type { ViewStyle } from 'react-native';
import { theme } from './theme';

/**
 * Page layout constants: one source for the page gutter and the section gap. Kept apart from
 * `PageShell` so the state components (`EmptyState`) can derive their list placement from the same
 * gutter without an import cycle.
 */

/** Page side gutter (web phone `px-4`). */
export const PAGE_GUTTER = theme.spacing[4];

/** Gap between page sections (web PageShell `space-y-4`). */
export const PAGE_SECTION_GAP = theme.spacing[4];

/**
 * Content style for the FlatList of a `mode="list"` screen (gutter + section gap). Its empty
 * `EmptyState` / `ErrorState` takes `placement="list"`, which subtracts this gutter so the state
 * sits where `PageShell` `empty` puts it (src/ui/CLAUDE.md › Empty and error states).
 */
export const pageListContentStyle: ViewStyle = {
  padding: PAGE_GUTTER,
  gap: PAGE_SECTION_GAP,
};
