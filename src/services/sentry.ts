/**
 * Sentry wrapper (mobile) around the real @sentry/react-native.
 * The native module cannot load in Expo Go, so a runtime guard keeps it a no-op there.
 * It is also a no-op without a DSN.
 */
import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";
import { IS_MAESTRO } from "@/config/maestro";
import { sentryEnvironment } from "./sentryEnvironment";
import { tracesSampleRate } from "./sentrySampling";
import { scrubBreadcrumb, scrubEvent, sentryUser } from "./sentryScrub";

export type SeverityLevel = "fatal" | "error" | "warning" | "info" | "debug";

export interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
}

interface CaptureOptions {
  level?: SeverityLevel;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: SentryUser;
}

const isExpoGo = Constants.executionEnvironment === "storeClient";
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const enabled = !isExpoGo && Boolean(dsn);

let initialized = false;

/**
 * Called once at app start (from app/_layout.tsx).
 * No-op in Expo Go or without a DSN.
 */
export function initSentry(): void {
  if (!enabled || initialized) return;
  initialized = true;
  // `preview` (every staging build and OTA) reports as `staging`; `__DEV__` and Maestro
  // E2E bundles as `development`; see ./sentryEnvironment.
  // The `process.env.EXPO_PUBLIC_*` access stays direct: Metro inlines it at build time.
  const environment = sentryEnvironment(process.env.EXPO_PUBLIC_ENVIRONMENT, {
    isDev: __DEV__,
    isE2E: IS_MAESTRO,
  });
  Sentry.init({
    dsn,
    environment,
    // Traces are sampled per environment (production 0.1, staging 0.02, development 0).
    tracesSampleRate: tracesSampleRate(environment),
    enableNative: true,
    // The SDK adds no default personal data such as IP, cookies or request bodies.
    sendDefaultPii: false,
    // Personal data and secrets never reach Sentry. Axios errors carry the serialized
    // request body in `config.data` (phone, address, IBAN, password) and the SDK copied
    // it into the event. Also scrubbed: session / payment tokens, OTP and 2FA secrets,
    // tokens in address queries (http + navigation breadcrumbs, transaction spans) and
    // the user's email (only the id is sent). Diagnostic fields (requestId, status, url,
    // i18nKey) are kept; see `./sentryScrub`.
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  });
}

/**
 * Yakalanmış bir exception'ı Sentry'ye gönderir.
 * Hiçbir şart sağlanmazsa konsola yazar, hata fırlatmaz.
 */
export function captureException(
  error: unknown,
  options: CaptureOptions = {},
): void {
  if (!enabled) {
    if (__DEV__)
      console.warn("[sentry] captureException (disabled):", error, options);
    return;
  }
  Sentry.withScope((scope) => {
    if (options.level) scope.setLevel(options.level);
    if (options.tags)
      Object.entries(options.tags).forEach(([k, v]) => scope.setTag(k, v));
    if (options.extra)
      Object.entries(options.extra).forEach(([k, v]) => scope.setExtra(k, v));
    if (options.user) scope.setUser(sentryUser(options.user));
    Sentry.captureException(error);
  });
}

export function captureMessage(
  message: string,
  level: SeverityLevel = "info",
): void {
  if (!enabled) {
    if (__DEV__)
      console.log("[sentry] captureMessage (disabled):", message, level);
    return;
  }
  Sentry.captureMessage(message, level);
}

/**
 * Olaylara kullanıcıyı iliştirir — YALNIZ id. Çağıran e-posta / kullanıcı adı verse de
 * gönderilmez (`beforeSend` aynı kuralı bir kez daha uygular).
 */
export function setUser(user: SentryUser | null): void {
  if (!enabled) return;
  Sentry.setUser(sentryUser(user));
}

/**
 * Gerçek bir Sentry breadcrumb ekler (Sentry.addBreadcrumb) — captureMessage'ın
 * aksine tam bir event GÖNDERMEZ, sadece bir sonraki hataya iliştirilecek iz
 * bırakır. debug/info/warn log seviyeleri buraya akmalı, captureMessage'a değil.
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message: string;
  level?: SeverityLevel;
  data?: Record<string, unknown>;
}): void {
  if (!enabled) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Performans iz kaydı: bir async işlemi sar, ne kadar sürdüğü Sentry'ye
 * raporlanır. Guard kapalıyken sadece fn'i çalıştırır.
 */
export async function withTransaction<T>(
  name: string,
  op: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!enabled) return fn();
  return Sentry.startSpan({ name, op }, () => fn());
}
