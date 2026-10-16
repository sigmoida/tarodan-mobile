/**
 * @jest-environment node
 *
 * Koruma testi: `app/` altındaki route OLMAYAN dosyalar route taramasına ve
 * bundle'a girmez.
 *
 * expo-router 6 `app/` altındaki her .ts/.tsx'i route sayar; `_hooks/`, `_lib/`,
 * `__tests__/` gibi klasörler için kendi istisnası yok. Bunu iki yer sağlıyor:
 *  (a) patches/expo-router@6.0.24.patch — require.context regex'leri
 *      (_ctx*.js) + typed routes (_ctx-shared.js EXPO_ROUTER_CTX_IGNORE).
 *      Regex'ler node_modules'ten OKUNUR: yama kaybolursa / expo-router
 *      güncellenip yama taşınmazsa bu test kırılır.
 *  (b) metro.config.js resolver.blockList — app/**\/__tests__/** engelli.
 */
import fs from 'fs';
import path from 'path';

const ROUTER_DIR = path.dirname(require.resolve('expo-router/package.json'));
const CTX_FILES = ['_ctx.js', '_ctx.ios.js', '_ctx.android.js', '_ctx.web.js'];

const REJECTED = [
  './settings/_x/_hooks/a.ts',
  './(auth)/__tests__/login.test.tsx',
  './_foo.tsx',
  './offers/_modals/CounterOfferModal.tsx',
  './product/[id]/_lib/types.ts',
];
const ACCEPTED = [
  './_layout.tsx',
  './settings/_layout.tsx',
  './product/[id]/index.tsx',
  './(tabs)/index.tsx',
  './+not-found.tsx',
];

/** `_ctx*.js` içindeki require.context regex literal'ini (tek satır) çıkarır. */
const readCtxRegex = (file: string): RegExp => {
  const src = fs.readFileSync(path.join(ROUTER_DIR, file), 'utf8');
  const match = src.match(/^\s*\/(\^\(\?:\\\.\\\/\).*)\/,?\s*$/m);
  if (!match) throw new Error(`require.context regex bulunamadı: ${file}`);
  return new RegExp(match[1]);
};

describe('expo-router yaması: `_` önekli yol parçaları route değil', () => {
  it.each(CTX_FILES)('%s private/test yollarını reddeder, route yollarını kabul eder', (file) => {
    const re = readCtxRegex(file);
    for (const p of REJECTED) expect({ p, match: re.test(p) }).toEqual({ p, match: false });
    for (const p of ACCEPTED) expect({ p, match: re.test(p) }).toEqual({ p, match: true });
  });

  it('_ctx-shared.js EXPO_ROUTER_CTX_IGNORE (typed routes) aynı kuralı uygular', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { EXPO_ROUTER_CTX_IGNORE: re } = require(path.join(ROUTER_DIR, '_ctx-shared.js'));
    for (const p of REJECTED) expect({ p, match: re.test(p) }).toEqual({ p, match: false });
    for (const p of ACCEPTED) expect({ p, match: re.test(p) }).toEqual({ p, match: true });
  });

  it('app/ altında `_` ile başlayan route dosyası yok (yalnız _layout)', () => {
    const appDir = path.join(__dirname, '..', 'app');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        // `_` klasörleri zaten route değil; içlerine inmeye gerek yok.
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('_')) walk(path.join(dir, entry.name));
        } else if (/^_(?!layout\.)[^/]*\.[tj]sx?$/.test(entry.name)) {
          offenders.push(path.relative(appDir, path.join(dir, entry.name)));
        }
      }
    };
    walk(appDir);
    expect(offenders).toEqual([]);
  });
});

describe('metro.config.js blockList', () => {
  it('app/**/__tests__/** dosyalarını engeller, normal route dosyalarını engellemez', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require('../metro.config.js');
    const raw = config.resolver.blockList;
    const list: RegExp[] = Array.isArray(raw) ? raw : [raw];
    const root = path.join(__dirname, '..');
    const blocked = (rel: string) => list.some((re) => re.test(path.join(root, rel)));

    expect(blocked('app/x/__tests__/y.test.tsx')).toBe(true);
    expect(blocked('app/(auth)/__tests__/login.test.tsx')).toBe(true);
    expect(blocked('app/(tabs)/index.tsx')).toBe(false);
    expect(blocked('app/settings/_layout.tsx')).toBe(false);
  });
});
