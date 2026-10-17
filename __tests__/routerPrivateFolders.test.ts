/**
 * @jest-environment node
 *
 * Koruma testi: `app/` altındaki route OLMAYAN dosyalar (`_hooks/`, `_lib/`,
 * `__tests__/`, `_foo.tsx` …) route taramasına girmez.
 *
 * expo-router 6 `app/` altındaki her .ts/.tsx'i route sayar; `_` klasörleri için
 * kendi istisnası yok. Bunu patches/expo-router@6.0.24.patch sağlar:
 * require.context regex'leri (_ctx*.js), typed routes (_ctx-shared.js
 * EXPO_ROUTER_CTX_IGNORE) ve typed-routes watch handler'ı. Regex'ler
 * node_modules'ten OKUNUR: yama kaybolursa / expo-router güncellenip yama
 * taşınmazsa bu test kırılır. (`__tests__` ayrıca Metro'nun varsayılan
 * blockList'inde de var — bundle'a hiç girmez.)
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROUTER_DIR = path.dirname(require.resolve('expo-router/package.json'));
const APP_DIR = path.join(__dirname, '..', 'app');

const REJECTED = [
  './settings/_x/_hooks/a.ts',
  './(auth)/__tests__/login.test.tsx',
  './_foo.tsx',
  './offers/_modals/CounterOfferModal.tsx',
  './product/[id]/_lib/types.ts',
  // `_` klasörünün içindeki her şey dışlanır — _layout dahil: klasör route
  // değilse onun layout'u da anlamsız (istisna yalnız dosya adına bakar).
  './_x/_layout.tsx',
  // `_layout` bir KLASÖR adı olarak istisna değil (istisna dosya adı içindir).
  './_layout/index.tsx',
  // İstisna yalnız bilinen platform uzantılarını tanır.
  './_layout.tablet.tsx',
];
const ACCEPTED = [
  './_layout.tsx',
  './settings/_layout.tsx',
  './_layout.ios.tsx',
  './x/_layout.native.tsx',
  './(a,b)/_layout.tsx',
  './_sitemap.tsx', // expo-router'ın kullanıcı override'ı
  './product/[id]/index.tsx',
  './[...rest].tsx',
  './(tabs)/index.tsx',
  './+not-found.tsx',
  './a_b/c.tsx', // segmentin ortasındaki `_` önemsiz
];

/** `_ctx*.js` içindeki require.context regex literal'ini (tek satır) çıkarır. */
const readCtxRegex = (file: string): RegExp => {
  const src = fs.readFileSync(path.join(ROUTER_DIR, file), 'utf8');
  const match = src.match(/^\s*\/(\^\(\?:\\\.\\\/\).*)\/,?\s*$/m);
  if (!match) throw new Error(`require.context regex bulunamadı: ${file}`);
  return new RegExp(match[1]);
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharedRegex: RegExp = require(path.join(ROUTER_DIR, '_ctx-shared.js')).EXPO_ROUTER_CTX_IGNORE;

// `+native-intent` native'de route dosyasıdır; web ctx'i ve typed routes onu
// upstream'de zaten dışlıyor — yama bu davranışa dokunmaz.
const CASES: [string, RegExp, boolean][] = [
  ['_ctx.js', readCtxRegex('_ctx.js'), true],
  ['_ctx.ios.js', readCtxRegex('_ctx.ios.js'), true],
  ['_ctx.android.js', readCtxRegex('_ctx.android.js'), true],
  ['_ctx.web.js', readCtxRegex('_ctx.web.js'), false],
  ['_ctx-shared.js (typed routes)', sharedRegex, false],
];

const results = (re: RegExp, paths: string[]) => paths.map((p) => [p, re.test(p)]);

describe('expo-router yaması: `_` önekli yol parçaları route değil', () => {
  it.each(CASES)('%s', (_name, re, acceptsNativeIntent) => {
    expect(results(re, REJECTED)).toEqual(REJECTED.map((p) => [p, false]));
    expect(results(re, ACCEPTED)).toEqual(ACCEPTED.map((p) => [p, true]));
    expect(re.test('./+native-intent.tsx')).toBe(acceptsNativeIntent);
  });

  it('typed-routes watch handler dev oturumunda eklenen `_` dosyalarını almaz', () => {
    const src = fs.readFileSync(path.join(ROUTER_DIR, 'build/typed-routes/index.js'), 'utf8');
    expect(src).toContain('TARODAN PATCH');

    // Modül yüklenirken varsayılan ctx'i EXPO_ROUTER_APP_ROOT'tan tarar → boş dizin.
    const appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'router-private-'));
    const prev = process.env.EXPO_ROUTER_APP_ROOT;
    process.env.EXPO_ROUTER_APP_ROOT = appRoot;
    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getWatchHandler } = require(path.join(ROUTER_DIR, 'build/typed-routes'));
        const added: string[] = [];
        const ctx = { keys: () => [], __add: (f: string) => added.push(f), __delete: () => undefined };
        const handler = getWatchHandler(appRoot, { ctx, regenerateFn: () => undefined });
        handler({ filePath: path.join(appRoot, 'settings/_x/_hooks/a.ts'), type: 'add' });
        handler({ filePath: path.join(appRoot, '(auth)/__tests__/login.test.tsx'), type: 'add' });
        handler({ filePath: path.join(appRoot, 'settings/index.tsx'), type: 'add' });
        expect(added).toEqual(['./settings/index.tsx']);
      });
    } finally {
      if (prev === undefined) delete process.env.EXPO_ROUTER_APP_ROOT;
      else process.env.EXPO_ROUTER_APP_ROOT = prev;
      fs.rmSync(appRoot, { recursive: true, force: true });
    }
  });

  it('app/ altında yama yüzünden route DIŞI kalan `_` dosyası yok', () => {
    // Route sayılan klasörlerde `_` ile başlayan her dosya, yamalı router
    // regex'inden geçmeli (`_layout`, `_sitemap`); geçmiyorsa (`_foo.tsx`,
    // `_layout.tablet.tsx`) sessizce route olmaktan çıkmış demektir.
    const routeRegex = readCtxRegex('_ctx.ios.js');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // `_` klasörleri route değil; içlerine inmeye gerek yok.
          if (!entry.name.startsWith('_')) walk(full);
        } else if (entry.name.startsWith('_') && /\.[tj]sx?$/.test(entry.name)) {
          const rel = `./${path.relative(APP_DIR, full).split(path.sep).join('/')}`;
          if (!routeRegex.test(rel)) offenders.push(rel);
        }
      }
    };
    walk(APP_DIR);
    expect(offenders).toEqual([]);
  });
});
