/**
 * Cozulen rotanin app/ agacinda gercekten var olmasi. "Uygulama acildi" ile
 * "dogru ekran acildi" ayni sey degil; bu test ikincisini kilitler.
 */
import fs from 'fs';
import path from 'path';
import { toMobileRoute } from '@/utils/notificationRoute';
import { shippablePaths } from '../index';

const APP_DIR = path.join(__dirname, '../../../../app');

/** app/ agacindaki rota desenlerini toplar: app/product/[id]/index.tsx → /product/[id] */
function collectRoutePatterns(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectRoutePatterns(full, `${prefix}/${entry.name}`));
    } else if (entry.name.endsWith('.tsx')) {
      const base = entry.name.replace(/\.tsx$/, '');
      out.push(base === 'index' ? prefix || '/' : `${prefix}/${base}`);
    }
  }
  return out;
}

/** Rota gruplarini ((tabs), (auth)) ve sorgu dizisini atar. */
function segments(route: string): string[] {
  return route
    .split('?')[0]
    .split('/')
    .filter((s) => s && !(s.startsWith('(') && s.endsWith(')')));
}

const PATTERNS = collectRoutePatterns(APP_DIR);

function routeExists(route: string): boolean {
  const target = segments(route);
  return PATTERNS.some((pattern) => {
    const segs = segments(pattern);
    if (segs.length !== target.length) return false;
    return segs.every((s, i) => s.startsWith('[') || s === target[i]);
  });
}

describe('cozulen rota app/ agacinda var', () => {
  it('rota agaci okunabildi', () => {
    expect(PATTERNS.length).toBeGreaterThan(50);
  });

  const included = shippablePaths().filter((p) => p.include);

  it.each(included.map((p) => [p.pattern, p.sample]))(
    '%s ornegi (%s) var olan bir rotaya cozulur',
    (_pattern, sample) => {
      const route = toMobileRoute(sample);
      expect(route).not.toBeNull();
      expect({ sample, route, exists: routeExists(route!) }).toEqual({
        sample,
        route,
        exists: true,
      });
    },
  );
});
