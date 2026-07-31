/**
 * Vitrin/boost akışının tek kaynağı `src/components/product/BoostModal.tsx`
 * (GET /products/:id/boost/options). Kaldırılan FeaturedListingsModal, API'de
 * olmayan /products/my-listings ucunu çağıran ölü bir kopyaydı; geri gelirse
 * yanlış uca giden ikinci bir akış oluşur.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

describe('vitrin akışı tek kaynak', () => {
  it('FeaturedListingsModal geri eklenmemiş', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/components/FeaturedListingsModal.tsx'))).toBe(false);
  });

  it("API'de olmayan /products/my-listings ucu hiçbir yerde çağrılmıyor", () => {
    const grep = (dir: string): string[] =>
      fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        if (e.name === 'node_modules' || e.name === '__tests__' || e.name.startsWith('.')) return [];
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) return grep(rel);
        if (!/\.(ts|tsx)$/.test(e.name)) return [];
        return fs.readFileSync(path.join(ROOT, rel), 'utf8').includes('products/my-listings') ? [rel] : [];
      });
    expect([...grep('src'), ...grep('app')]).toEqual([]);
  });
});
