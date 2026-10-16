/**
 * Envanter testi: `app/**` altındaki HER rota ekranı bir kabuk içerir — üst bar/güvenli alan elle
 * çizilmez. Kabuklar: PageShell (+ ContentPage/EntityProductsScreen/
 * ListingForm / AddressForm / DiscountForm gibi onu saran sayfa bileşenleri), AppShell (sekme kökü), AuthShell, GateScreen /
 * FullScreenGate (bilinçli çubuksuz kapı ekranları), OwnSiteWebView (+ onu saran LegalWebPage), Redirect (ekran değil).
 *
 * Ayrıca: `PageShell header={…}` ile özel üst bar yalnız izinli listede; native `headerShown: true`
 * hiçbir yerde yok.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');
const APP = path.join(ROOT, 'app');

const SHELL =
  /<(PageShell|ContentPage|EntityProductsScreen|ListingForm|AddressForm|DiscountForm|AppShell|AuthShell|AuthGatePage|GateScreen|FullScreenGate|OwnSiteWebView|LegalWebPage|Redirect)\b/;

/** `header={<Özel />}` ile üst barı kendisi veren ekranlar (ScreenHeader'ı `titleSlot` ile sarar). */
const CUSTOM_HEADER_ALLOWED = ['app/messages/[threadId]/index.tsx'];

/** Rota dosyaları: `_` önekli klasörler (hooks/components/…), `__tests__`, `_layout`, `+` dosyaları hariç. */
function routeFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || (entry.name.startsWith('_') && entry.isDirectory())) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) routeFiles(full, out);
    else if (
      entry.name.endsWith('.tsx') &&
      !entry.name.startsWith('_layout') &&
      !entry.name.startsWith('+')
    ) {
      out.push(full);
    }
  }
  return out;
}

const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');
const files = routeFiles(APP);

describe('app/** ekran kabukları', () => {
  it('rota dosyaları bulunur (tarama çalışıyor)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('her rota ekranı bir kabuk (PageShell/AppShell/AuthShell/Gate/…) içerir', () => {
    const missing = files.filter((f) => !SHELL.test(fs.readFileSync(f, 'utf8'))).map(rel);
    expect(missing).toEqual([]);
  });

  it('sekme kökleri AppShell, üst bardan açılan Mesajlar/Bildirimler yığın ekranı PageShell kullanır', () => {
    const read = (f: string) => fs.readFileSync(path.join(APP, f), 'utf8');
    for (const f of ['(tabs)/index.tsx', '(tabs)/favorites/index.tsx', '(tabs)/cart/index.tsx', '(tabs)/profile.tsx']) {
      expect([f, /<AppShell\b/.test(read(f))]).toEqual([f, true]);
    }
    for (const f of ['messages/index.tsx', 'notifications/index.tsx']) {
      expect([f, /<PageShell\b/.test(read(f)), /<AppShell\b/.test(read(f))]).toEqual([f, true, false]);
    }
    // Eski konumlar kalmadı (aynı URL'ye iki rota çakışmasın).
    for (const gone of ['(tabs)/messages', '(tabs)/notifications', 'cart', 'favorites']) {
      expect([gone, fs.existsSync(path.join(APP, gone))]).toEqual([gone, false]);
    }
  });

  it('özel üst bar (header={…}) yalnız izinli listede', () => {
    const offenders = files
      .filter((f) => /\bheader=\{(?!false\})/.test(fs.readFileSync(f, 'utf8')))
      .map(rel)
      .filter((f) => !CUSTOM_HEADER_ALLOWED.includes(f));
    expect(offenders).toEqual([]);
  });

  it('native header açılmaz: hiçbir yerde headerShown: true yok', () => {
    const all: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '__tests__') continue;
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(e.name)) all.push(full);
      }
    };
    walk(APP);
    walk(path.join(ROOT, 'src'));
    const offenders = all
      .filter((f) => /headerShown:\s*true/.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
