/**
 * `GET /orders/:id/my-review` ölü bir export'tu: tanımlıydı, hiçbir yerden
 * çağrılmıyordu. Değerlendirme durumunun kaynağı zaten sipariş gövdesindeki
 * `hasProductRating` / `hasSellerRating` — ikisi de sunucudan geliyor ve
 * `OrderRatingButtons` onları okuyor. İkinci bir uç eklemek, aynı gerçeğin iki
 * kaynağı olması demekti (CLAUDE.md §5).
 *
 * Uç gerçekten gerekirse geri gelebilir; bu test yalnız "tanımlı ama
 * çağrılmayan" hâline geri dönülmediğini kilitler.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');

function filesContaining(dir: string, needle: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return filesContaining(rel, needle);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return fs.readFileSync(path.join(ROOT, rel), 'utf8').includes(needle) ? [rel] : [];
  });
}

/** Yorum satırları sayılmaz — aranan şey gerçek bir çağrı/tanım. */
function callSites(needle: string): string[] {
  return [...filesContaining('src', needle), ...filesContaining('app', needle)]
    .filter((f) => !f.includes('__tests__'))
    .filter((f) =>
      fs
        .readFileSync(path.join(ROOT, f), 'utf8')
        .split('\n')
        .some((line) => {
          const code = line.trim();
          if (code.startsWith('*') || code.startsWith('//') || code.startsWith('/*')) return false;
          return code.includes(needle);
        }),
    );
}

describe('değerlendirme durumu tek kaynak', () => {
  it('my-review ucuna giden bir çağrı yok', () => {
    expect(callSites('my-review')).toEqual([]);
  });

  it('getMyReview ölü export olarak durmuyor', () => {
    expect(callSites('getMyReview')).toEqual([]);
  });

  it('değerlendirme durumu hâlâ sipariş gövdesinden okunuyor', () => {
    const card = fs.readFileSync(
      path.join(ROOT, 'app/orders/[id]/_components/OrderActionCards.tsx'),
      'utf8',
    );
    expect(card).toContain('hasProductRating');
    expect(card).toContain('hasSellerRating');
  });
});

describe('ölü komisyon önizleme bileşeni', () => {
  it('geri eklenmemiş', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/components/common/CommissionPreview.tsx'))).toBe(false);
  });

  it('kaldırılma sebebi geçerli: net kazanç önizlemesi tek yerde', () => {
    // Bileşen hiçbir yerde render edilmiyordu ve `commission-preview`'e
    // `packageTier` GÖNDERMİYORDU — geri gelirse satıcıya her zaman en küçük
    // paketin net kazancını gösteren ikinci bir kaynak olur.
    const form = fs.readFileSync(
      path.join(ROOT, 'src/components/listing/_hooks/useListingForm.ts'),
      'utf8',
    );
    expect(form).toContain('packageTier');
  });
});
