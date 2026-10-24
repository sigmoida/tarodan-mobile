import * as Application from "expo-application";
import * as Updates from "expo-updates";
import type { TFunction } from "i18next";
import { buildEnvironment, type SentryEnvironment } from "@/services/sentryEnvironment";
import { getAppVersion } from "./appUpdate";

/** How many characters of the OTA update id the label shows. */
export const UPDATE_ID_LENGTH = 6;

/**
 * What the running app is, for the build label at the bottom of Settings: the
 * store version, the native build number, the OTA update it runs and the
 * environment it reports to Sentry under.
 */
export interface AppBuildInfo {
  /** `expo.version` (e.g. "1.2.3"); null if the config can't be resolved. */
  version: string | null;
  /**
   * The binary's build number (iOS CFBundleVersion, Android versionCode). Only the
   * binary knows it: EAS sets it remotely (`appVersionSource: "remote"`), so the
   * `app.json` value is stale.
   */
  buildNumber: string | null;
  /** The first `UPDATE_ID_LENGTH` characters of the OTA id; null on the embedded bundle. */
  updateId: string | null;
  environment: SentryEnvironment;
}

export function getAppBuildInfo(): AppBuildInfo {
  // Without an applied OTA the id is the embedded manifest's (embedded launch) or missing
  // (expo-updates off: dev client, Metro). Neither names an OTA, so both count as the
  // embedded bundle; the label shows the embedded marker for them.
  const updateId =
    !Updates.isEmbeddedLaunch && Updates.updateId
      ? Updates.updateId.slice(0, UPDATE_ID_LENGTH)
      : null;
  return {
    version: getAppVersion(),
    buildNumber: Application.nativeBuildVersion || null,
    updateId,
    environment: buildEnvironment(),
  };
}

/** The environment suffix of the label; production has none. */
const ENVIRONMENT_LABEL = {
  production: null,
  staging: "mobile.appEnvironmentStaging",
  development: "mobile.appEnvironmentDevelopment",
} as const satisfies Record<SentryEnvironment, string | null>;

/**
 * The label text: `1.2.3 (343) · a1b2c3 (Staging)`. Production has no environment
 * suffix; without a build number only the version shows. On the embedded bundle
 * staging and development show the embedded marker instead of an id; production
 * shows only the version (the marker means nothing to a user, the id still helps
 * support once an OTA is applied). Null when the version is unknown (the row is
 * then hidden). Takes `t` from the caller (`src/i18n/CLAUDE.md` › Build labels at
 * call time).
 */
export function formatAppBuildLabel(info: AppBuildInfo, t: TFunction): string | null {
  if (!info.version) return null;
  const version = info.buildNumber
    ? t("mobile.appBuildVersion", { version: info.version, build: info.buildNumber })
    : info.version;
  const environment = ENVIRONMENT_LABEL[info.environment];
  if (!environment && !info.updateId) return version;
  const update = info.updateId ?? t("mobile.appBuildEmbedded");
  return environment
    ? t("mobile.appBuildLabelWithEnvironment", { version, update, environment: t(environment) })
    : t("mobile.appBuildLabel", { version, update });
}
