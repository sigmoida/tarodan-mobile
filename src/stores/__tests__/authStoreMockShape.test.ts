/**
 * `useAuthStore` mock'ları SELECTOR'Ü desteklemeli.
 *
 * Üretim kodu store'u iki şekilde okuyor: tamamını (`useAuthStore()`) ve
 * selector'le (`useAuthStore((s) => s.token)`). Selector'ü yok sayan bir mock
 * ikinci çağrıda TÜM STATE NESNESİNİ döndürür — `AppImage` bunu şablona koyup
 * `Bearer [object Object]` üretir ve test yeşil kalır, çünkü mock zaten hiçbir
 * şey doğrulamaz. Sızıntı sessiz olduğu için insan gözüyle yakalanmıyor.
 *
 * Bu test mock'un davranışını değil ŞEKLİNİ kontrol eder; asıl amaç yeni
 * eklenen bir dosyanın eski desene geri dönmesini engellemek.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

function testFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return testFiles(rel);
    return /\.test\.tsx?$/.test(entry.name) ? [rel] : [];
  });
}

describe('useAuthStore mock şekli', () => {
  it('hiçbir test selector almayan bir mock kurmuyor', () => {
    // Aranan desen bu dosyanın kendi içinde de geçiyor — kendini eleyelim.
    const SELF = 'src/stores/__tests__/authStoreMockShape.test.ts';
    // Parçalı yazılıyor ki tarama kendi arama metnini bulmasın.
    const pattern = 'useAuthStore: ' + '() =>';

    const offenders = [...testFiles('app'), ...testFiles('src')]
      .filter((file) => file !== SELF)
      .filter((file) => fs.readFileSync(path.join(ROOT, file), 'utf8').includes(pattern));

    expect(offenders).toEqual([]);
  });
});
