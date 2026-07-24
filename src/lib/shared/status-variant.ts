/**
 * Canonical, platform-agnostic semantic variant vocabulary.
 *
 * Both the web ui package (web `Badge`) and @/ui (mobile `Badge`)
 * accept these values, so a single `StatusConfig` map can drive badges on
 * every surface.
 *
 * NOTE: `destructive` is a legacy alias of `danger` (identical styling on
 * both platforms). It is kept for backward-compat with existing web usage
 * and should be codemodded to `danger` in a later pass, then removed here.
 */
export type StatusVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline'
  | 'destructive';
