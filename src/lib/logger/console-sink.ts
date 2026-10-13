import { safeError } from "./safe-error";
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

const looksLikeError = (v: unknown): boolean =>
  v instanceof Error ||
  (v !== null &&
    typeof v === "object" &&
    ("isAxiosError" in v || ("config" in v && "response" in v)));

/**
 * Release'te bağlamdaki hata nesneleri (özellikle AxiosError: Authorization başlığı,
 * istek/yanıt gövdesi taşır) ham basılmaz; `safeError` özetiyle değiştirilir.
 * Geliştirmede ham nesne kalır (yığın izi gerekir).
 */
function printable(
  context: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!context || isDev()) return context;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) out[k] = looksLikeError(v) ? safeError(v) : v;
  return out;
}

export class ConsoleSink implements Sink {
  constructor(private readonly options: ConsoleSinkOptions = {}) {}

  log(rawEntry: LogEntry): void {
    const entry: LogEntry = {
      ...rawEntry,
      context: printable(rawEntry.context),
      error: !isDev() && looksLikeError(rawEntry.error) ? safeError(rawEntry.error) : rawEntry.error,
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
