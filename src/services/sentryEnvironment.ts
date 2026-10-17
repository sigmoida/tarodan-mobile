/**
 * The Sentry `environment` of this build, set explicitly (tarodan-ops
 * `docs/observability.md`: `production` or `staging`, never derived from
 * `NODE_ENV`).
 *
 * The app's own variable stays `EXPO_PUBLIC_ENVIRONMENT=preview` for every staging
 * build and OTA (`eas.json` `preview` and `staging` profiles): it selects the
 * `.staging` app id in `app.config.js` and the release checks in
 * `scripts/ci/release.sh`, so it is not renamed. Sentry, like the API, web and
 * admin, calls that environment `staging`; this is the one place that maps it.
 * Only `preview` counts, as in `app.config.js` (a build with any other value gets
 * the production app id, so it must not report as staging).
 *
 * Everything else reports as `development`, so it never pollutes the production
 * or staging alerts: the `development` profile, a local release build without the
 * variable, an unknown value, and Maestro E2E builds (`eas.json` `maestro` extends
 * `preview`, but its errors are provoked by the test run).
 */
export type SentryEnvironment = "production" | "staging" | "development";

export function sentryEnvironment(
  appEnvironment: string | undefined,
  isE2E: boolean,
): SentryEnvironment {
  if (isE2E) return "development";
  switch (appEnvironment) {
    case "production":
      return "production";
    case "preview":
      return "staging";
    default:
      return "development";
  }
}
