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
 *
 * Anything that is not explicitly production or staging (the `development`
 * profile, a local release build without the variable, an unknown value) reports
 * as `development`, so it never pollutes the production or staging alerts.
 */
export type SentryEnvironment = "production" | "staging" | "development";

export function sentryEnvironment(
  appEnvironment: string | undefined,
): SentryEnvironment {
  switch (appEnvironment) {
    case "production":
      return "production";
    case "preview":
    case "staging":
      return "staging";
    default:
      return "development";
  }
}
