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
  // Without an applied OTA (embedded launch, or expo-updates off in a dev client) the
  // id is the embedded manifest's or missing; neither names an OTA, so show neither.
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

/**
 * The label text: `1.2.3 (343) · a1b2c3 (Staging)`. Production has no environment
 * suffix; without a build number only the version shows; the embedded bundle shows
 * the embedded marker instead of an id. Null when the version is unknown (the row
 * is then hidden). Takes `t` from the caller (`src/i18n/CLAUDE.md` › Build labels at
 * call time).
 */
export function formatAppBuildLabel(info: AppBuildInfo, t: TFunction): string | null {
  if (!info.version) return null;
  const version = info.buildNumber
    ? t("mobile.appBuildVersion", { version: info.version, build: info.buildNumber })
    : info.version;
  const update = info.updateId ?? t("mobile.appBuildEmbedded");
  switch (info.environment) {
    case "production":
      return t("mobile.appBuildLabel", { version, update });
    case "staging":
      return t("mobile.appBuildLabelWithEnvironment", {
        version,
        update,
        environment: t("mobile.appEnvironmentStaging"),
      });
    case "development":
      return t("mobile.appBuildLabelWithEnvironment", {
        version,
        update,
        environment: t("mobile.appEnvironmentDevelopment"),
      });
  }
}
