/**
 * Status/enum → label + variant metadata.
 *
 * The maps live in the platform-agnostic @/lib/shared package (single
 * source of truth shared with the web ui package). Re-exported here so existing
 * `@/ui` imports (orderStatusConfig, StatusConfig, ...) keep
 * working unchanged.
 */
export * from '@/lib/shared';
