import { scrubForConsole, scrubString } from "./scrub";
import type { LogEntry, Sink } from "./types";

const LABEL: Record<string, string> = {
  debug: "🔍 DEBUG",
  info: "ℹ️  INFO",
  warn: "⚠️  WARN",
  error: "❌ ERROR",
};

export interface ConsoleSinkOptions {
  json?: boolean;
}

const isDev = (): boolean => typeof __DEV__ !== "undefined" && __DEV__;

/**
 * Release'te bağlam ve hata DERİNLEMESİNE temizlenir (`scrubForConsole`): hata benzeri
 * nesneler (özellikle AxiosError: Authorization, istek/yanıt gövdesi) `safeError` özetine
 * döner; `response/data/headers/config/request` ve token/e-posta benzeri anahtar/değerler
 * maskelenir (Sentry ile ortak kurallar, bkz. `scrub.ts`). Geliştirmede ham kalır
 * (yığın izi gerekir).
 */
function printable(
  context: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!context || isDev()) return context;
  return scrubForConsole(context);
}

export class ConsoleSink implements Sink {
  constructor(private readonly options: ConsoleSinkOptions = {}) {}

  log(rawEntry: LogEntry): void {
    const entry: LogEntry = {
      ...rawEntry,
      context: printable(rawEntry.context),
      message: isDev() ? rawEntry.message : scrubString(rawEntry.message),
      error: isDev() ? rawEntry.error : scrubForConsole(rawEntry.error),
    };
    if (this.options.json) {
      console.log(JSON.stringify(entry));
      return;
    }
    const prefix = `${LABEL[entry.level] ?? entry.level} [${entry.name}]`;
    const args: unknown[] = [prefix, entry.message];
    if (entry.context && Object.keys(entry.context).length)
      args.push(entry.context);
    if (entry.level === "error") console.error(...args);
    else if (entry.level === "warn") console.warn(...args);
    else console.log(...args);
  }

  // Console sink does not produce breadcrumbs/captureException — log() is enough.
}
