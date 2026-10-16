/**
 * Ayarlar ekranının "Bilgi & Yasal" grubu yalnız uygulamada kalan altı yasal belgeyi
 * gösterir; her kaydın gerçek bir ekranı var ve kaldırılan bilgi sayfalarına
 * (hakkımızda, rehberler, alıcı koruması …) giden satır kalmadı.
 */
import * as fs from 'fs';
import * as path from 'path';
import i18n from '@/i18n/config';
import { LEGAL_WEB_DOCS } from '@/lib/legal/webDocs';
import { buildLegalPages } from '@/lib/menu/legalPages';
import { buildAccountPages } from '@/lib/menu/accountPages';
import { buildProfileMenuGroups } from '@/lib/menu/profileMenu';

const ROOT = path.resolve(__dirname, '../../..');
const LEGAL_PAGES = buildLegalPages(i18n.t);

function routeExists(route: string): boolean {
  const base = path.join(ROOT, 'app', route);
  return fs.existsSync(`${base}.tsx`) || fs.existsSync(path.join(base, 'index.tsx'));
}

describe('LEGAL_PAGES kataloğu', () => {
  it('altı yasal belgenin hepsi, yalnız onlar — tek listeden, aynı sırayla', () => {
    expect(LEGAL_PAGES.map((p) => p.route)).toEqual(LEGAL_WEB_DOCS.map((d) => `/${d}`));
  });

  it('her kaydın etiketi ve gerçek bir ekranı var', () => {
    [...LEGAL_PAGES.map((p) => ({ route: p.route, label: p.label })), ...buildAccountPages(i18n.t)].forEach(
      (p) => {
        expect(p.label.length).toBeGreaterThan(0);
        expect(routeExists(p.route)).toBe(true);
      },
    );
  });

  it('"Bilgi & Yasal" grubu yalnız yasal belgeleri içerir', () => {
    const info = buildProfileMenuGroups(i18n.t).find((g) => g.key === 'info')!;
    expect(info.items.map((i) => i.to)).toEqual(LEGAL_PAGES.map((p) => p.route));
  });

  it('kaldırılan bilgi sayfalarına giden menü satırı yok', () => {
    const removed = [
      '/about',
      '/authenticity',
      '/collectors-guide',
      '/guides',
      '/size-guide',
      '/payment-options',
      '/shipping-delivery',
      '/security-features',
      '/intellectual-property',
      '/buyer-protection',
      '/guvenli-takas',
      '/platform-hizmet-bedeli',
      '/faq',
      '/returns-exchanges',
    ];
    const targets = buildProfileMenuGroups(i18n.t).flatMap((g) => g.items.map((i) => i.to));
    for (const route of removed) {
      expect(targets).not.toContain(route);
      expect(routeExists(route)).toBe(false);
    }
  });
});
