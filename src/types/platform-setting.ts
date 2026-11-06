// Vendored copy of tarodan-app `packages/types/src/platform-setting.ts` (feat/installment-direct-form
// 94f7d62cc). Everything below this header matches the source; change it there first.
// Contract: the shared on/off rule for platform settings (no API change).
/**
 * On/off platform settings (`platform_settings`, written from admin with
 * `PATCH /admin/settings/:key`). Only the text "true" (any case, trimmed) is
 * on; a missing row, an empty value or anything else is off. The API and the
 * admin toggles read every on/off setting through this one rule.
 */
export function isPlatformSettingOn(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/** The value an admin toggle writes for an on/off setting. */
export function platformSettingOnOffValue(on: boolean): "true" | "false" {
  return on ? "true" : "false";
}
