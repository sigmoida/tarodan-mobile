import type { DeepLinkPath } from '../../index';

/**
 * Samples the tests resolve in place of a stale `paths.json` `sample`.
 *
 * `paths.json` is a runtime fingerprint input (`app.config.js` requires it), so editing even a
 * `sample` there changes the runtime version and turns a JS change into a store build. The
 * listing sample `/listings/123` predates ADR 0017 (a listing segment must end in a uuid) and no
 * longer resolves; it is replaced here until the next `build(native)` commit updates the table.
 */
const SAMPLE_OVERRIDES: Readonly<Record<string, string>> = {
  '/listings/*': '/listings/ferrari-f40-0b1e5c1a-7d2f-4e3a-9c4b-5d6e7f8a9b0c',
};

/** The sample a test resolves for a table row. */
export function routeSample(p: Pick<DeepLinkPath, 'pattern' | 'sample'>): string {
  return SAMPLE_OVERRIDES[p.pattern] ?? p.sample;
}

/** Table rows whose `sample` is overridden here (each must still be stale; see `paths.test.ts`). */
export const overriddenSamplePatterns = (): string[] => Object.keys(SAMPLE_OVERRIDES);
