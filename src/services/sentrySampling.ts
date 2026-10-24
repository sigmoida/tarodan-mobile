/**
 * Sentry trace sampling per environment (single place for the mobile rate).
 *
 * Mirrors the mobile column of the `@tarodan/logger` `sentrySampling(environment)`
 * table in tarodan-app (the source of the rates for api, web, admin and mobile):
 * production 0.1, staging 0.02, development 0. Errors are always sent in full
 * (`sampleRate` stays at the SDK default of 1.0); only performance traces are
 * sampled. Keep the two tables in step.
 */
import type { SentryEnvironment } from "./sentryEnvironment";

const TRACES_SAMPLE_RATE: Record<SentryEnvironment, number> = {
  production: 0.1,
  staging: 0.02,
  development: 0,
};

export function tracesSampleRate(environment: SentryEnvironment): number {
  return TRACES_SAMPLE_RATE[environment] ?? 0;
}
