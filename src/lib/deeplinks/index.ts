/**
 * Derin baglanti yol tablosu — AASA, assetlinks.json ve app.json Android
 * intent filter'larinin TEK kaynagi. Saf: ag ve fs erisimi yok.
 *
 * Neden tek kaynak: eski docs/ios-universal-links.md listesi elle yazilmisti ve
 * MOBIL rota adlarina kaymisti (/product/* vs web /listings/:id). Dosya oyle
 * yayinlansaydi Apple onu kabul eder, dogrulama yesil gorunur, linklerin cogu
 * yine Safari'de acilirdi.
 */
import raw from './paths.json';

export type DeepLinkPath = {
  /** Web URL deseni — AASA components + Android path girdisi kaynagi. */
  pattern: string;
  /** Gercek ornek URL — testte toMobileRoute'a birebir verilir. */
  sample: string;
  /** false → tarayicida kalsin. Dislama da bir karardir, tabloda durur. */
  include: boolean;
  /** Web'de var oldugu teyitli mi. false → uretilen dosyalara girmez. */
  confirmed: boolean;
  comment: string;
};

export type DeepLinkConfig = {
  locales: string[];
  appIDs: string[];
  androidPackage: string;
  hosts: string[];
  paths: DeepLinkPath[];
};

export type AndroidPathEntry = { path: string } | { pathPrefix: string };

// resolveJsonModule JSON'u dar literal tiplerle cikarir; DeepLinkConfig'e
// dogrudan cast TS'i rahatsiz ederse `raw as unknown as DeepLinkConfig` kullan.
export const deepLinkConfig = raw as DeepLinkConfig;

export const shippablePaths = (): DeepLinkPath[] =>
  deepLinkConfig.paths.filter((p) => p.confirmed);

export const pendingConfirmation = (): DeepLinkPath[] =>
  deepLinkConfig.paths.filter((p) => !p.confirmed);

/** `/listings/*` → ['/listings/*', '/tr/listings/*', '/en/listings/*'] */
export function withLocaleVariants(pattern: string): string[] {
  return [pattern, ...deepLinkConfig.locales.map((l) => `/${l}${pattern}`)];
}

// AASA/assetlinks uretimi BILEREK burada degil: tek uygulama
// scripts/gen-wellknown.mjs'de. Buraya bir kopya konursa iki taraf ayri ayri
// bakim ister ve sessizce ayrisir — tam da elle yazilan AASA listesinin
// basina gelen sey. Uretilen dosyanin dogrulugu paths.test.ts'te ozellik
// testleriyle olculur.

/**
 * URL'den yol + sorgu dizesini cikarir (sema/host'u atarak). Sema yoksa girdi
 * ZATEN yol kabul edilir — expo-router `redirectSystemPath`'e surumune gore ya
 * tam URL ya da bas slash'siz cikarilmis yol (`product/p-1`) verir; ikisini de
 * ayni normal forma indiriyoruz. Kok URL (`tarodan:///`, `https://host`) → null.
 */
export function pathFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.*)$/);

  let path: string;
  if (!match) {
    // Semasiz girdi: `product/p-1` ya da `/product/p-1`.
    path = url;
  } else {
    const [, scheme, afterScheme] = match;
    if (scheme === 'http' || scheme === 'https') {
      // https://host/yol?q — host'u at, yol+sorgu'yu tut.
      const idx = afterScheme!.search(/[/?]/);
      path = idx === -1 ? '' : afterScheme!.slice(idx);
    } else {
      // custom scheme'de host segmenti yol gibi davranir: tarodan://product/p-1
      path = afterScheme!;
    }
  }

  if (!path) path = '/';
  else if (path.startsWith('?')) path = `/${path}`;
  else if (!path.startsWith('/')) path = `/${path}`;

  // Ardisik slash'lari tekile indir (or. https://host//product/p-1).
  path = path.replace(/\/{2,}/g, '/');

  return path === '/' || path === '/?' ? null : path;
}

/**
 * `include: false` satirlari — tarayicida kalmasi KARARLASTIRILMIS yollar
 * (`/checkout*`, `/payment/*`, `/admin/*`, `/api/*`). Tek kaynak paths.json;
 * ikinci bir liste tutulmaz.
 */
export function isExcludedWebPath(pathWithQuery: string): boolean {
  const path = pathWithQuery.split('?')[0]!.replace(/\/+$/, '') || '/';
  return deepLinkConfig.paths
    .filter((p) => !p.include)
    .flatMap((p) => withLocaleVariants(p.pattern))
    .some((pattern) =>
      pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern,
    );
}

export function toAndroidPathEntry(pattern: string): AndroidPathEntry {
  return pattern.endsWith('*')
    ? { pathPrefix: pattern.slice(0, -1) }
    : { path: pattern };
}

/** Android'de dislama kavrami yok: listelenmeyen yol zaten talep edilmez. */
export function buildAndroidPathEntries(): AndroidPathEntry[] {
  return shippablePaths()
    .filter((p) => p.include)
    .flatMap((p) => withLocaleVariants(p.pattern).map(toAndroidPathEntry));
}
