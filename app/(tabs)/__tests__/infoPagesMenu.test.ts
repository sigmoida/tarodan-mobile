/**
 * Menüsüz kalan statik ekranlar.
 *
 * Denetim (2026-08-03): uygulamada yazılmış ama hiçbir yerden `router.push`
 * edilmeyen ~12 bilgi ekranı var. Kod duruyor, kullanıcı ulaşamıyor —
 * `buyer-protection` üzerinden geçilen `returns-exchanges` ve `refund-policy`
 * de fiilen ölü, çünkü giriş sayfasının kendisi menüsüz.
 *
 * Bu test kataloğun ekranlarla tutarlı kalmasını sağlar: yeni bir kayıt
 * eklenip dosyası unutulursa ya da tersi olursa kırılır.
 */
import * as fs from 'fs';
import * as path from 'path';

import { INFO_PAGES, ACCOUNT_PAGES } from '../_lib/infoPages';
import { LEGAL_PAGES } from '../_lib/legalPages';

const ROOT = path.resolve(__dirname, '../../..');

function routeExists(route: string): boolean {
  const base = path.join(ROOT, 'app', route);
  return fs.existsSync(`${base}.tsx`) || fs.existsSync(path.join(base, 'index.tsx'));
}

describe('INFO_PAGES kataloğu', () => {
  it('her kaydın gerçek bir ekranı var', () => {
    [...INFO_PAGES, ...ACCOUNT_PAGES].forEach((page) => {
      expect(routeExists(page.route)).toBe(true);
    });
  });

  it('her kaydın etiketi ve ikonu var', () => {
    [...INFO_PAGES, ...ACCOUNT_PAGES].forEach((page) => {
      expect(page.label.length).toBeGreaterThan(0);
      expect(page.icon.length).toBeGreaterThan(0);
    });
  });

  it('CMS hukuki sayfalarını çiftlemez', () => {
    // Statik `cookies` ekranı CMS'teki `cookie-policy` ile aynı içerik;
    // ikisini birden bağlamak kullanıcıya aynı metni iki yerden gösterirdi.
    const cmsSlugs = LEGAL_PAGES.map((p) => p.slug);
    INFO_PAGES.forEach((page) => {
      expect(cmsSlugs).not.toContain(page.route);
    });
    expect(INFO_PAGES.map((p) => p.route)).not.toContain('cookies');
  });

  it('sabit /help ekranıyla çiftlenen faq kaydını içermez', () => {
    expect(INFO_PAGES.map((p) => p.route)).not.toContain('faq');
  });

  it('yönlendirme olan pricing ekranını içermez', () => {
    expect([...INFO_PAGES, ...ACCOUNT_PAGES].map((p) => p.route)).not.toContain('pricing');
  });
});

describe('menüsüz ekran kalmadı', () => {
  /** Denetimde ölü bulunan ekranların tamamı. */
  const PREVIOUSLY_DEAD = [
    'guides',
    'size-guide',
    'payment-options',
    'security-features',
    'shipping-delivery',
    'distance-sales',
    'seller-agreement',
    'intellectual-property',
    'guvenli-takas',
    'buyer-protection',
    'returns-exchanges',
    'refund-policy',
    'following',
    'newsletter',
  ];

  it('hepsi artık bir menü kaydına bağlı', () => {
    const linked = [...INFO_PAGES, ...ACCOUNT_PAGES].map((p) => p.route);
    const stillDead = PREVIOUSLY_DEAD.filter((route) => !linked.includes(route));

    expect(stillDead).toEqual([]);
  });
});
