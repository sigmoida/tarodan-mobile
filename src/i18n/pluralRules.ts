/**
 * Hermes (React Native) `Intl.PluralRules` sağlamaz. `intl-messageformat` (i18next-icu)
 * `{n, plural, one {…} other {…}}` ifadelerini çözerken bunu çağırır; yoksa çözümleme
 * hata verir ve i18next-icu HAM ICU metnini döndürür ("{count, plural, …}" ekranda görünür).
 *
 * Desteklenen diller (tr, en) için yeterli minimal çoğul kuralı: yalnız `one` / `other`
 * (tr'de 1 → one, en'de 1 → one; diğer her şey other). Gerçek `Intl.PluralRules` varsa
 * ona dokunulmaz.
 */
type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

class MinimalPluralRules {
  readonly type: "cardinal" | "ordinal";

  constructor(_locales?: string | string[], options?: { type?: "cardinal" | "ordinal" }) {
    this.type = options?.type ?? "cardinal";
  }

  select(n: number): PluralCategory {
    if (this.type === "ordinal") return "other";
    return n === 1 ? "one" : "other";
  }

  resolvedOptions() {
    return { locale: "en", type: this.type, pluralCategories: ["one", "other"] };
  }

  static supportedLocalesOf(locales?: string | string[]): string[] {
    return locales === undefined ? [] : Array.isArray(locales) ? locales : [locales];
  }
}

/** Idempotent: yalnız `Intl.PluralRules` yoksa kurar. Kurulduysa true döner. */
export function ensurePluralRules(): boolean {
  const intl = Intl as unknown as { PluralRules?: unknown };
  if (typeof intl.PluralRules === "function") return false;
  intl.PluralRules = MinimalPluralRules;
  return true;
}
