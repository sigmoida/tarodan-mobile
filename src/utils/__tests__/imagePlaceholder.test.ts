/**
 * Faz 0 regresyon koruması — görsel yedeği için hiçbir ağ isteği yapılmamalı.
 * `via.placeholder.com` (ölü) ve `placehold.co` (üçüncü parti) domain'lerinin
 * kaynak ağacına geri sızmasını engeller. Dosya-içeriği tarayan test deseni
 * için bkz. src/config/__tests__/releaseWorkflow.test.ts.
 */
import * as fs from 'fs';
import * as path from 'path';
import { IMAGE_PLACEHOLDER } from '../imageUrl';

const ROOT = path.resolve(__dirname, '../../..');
const SCAN_DIRS = ['src', 'app'];
const SELF = path.resolve(__filename);
// Parçalara bölünmüş yazılıyor ki bu dosyanın kendisi kendi taramasında
// "domain geçer" diye yanlış pozitif üretmesin.
const BANNED_DOMAINS = ['via.' + 'placeholder.com', 'placehold' + '.co'];

/** src/ ve app/ altındaki her .ts/.tsx dosyasını (test dosyaları dahil) toplar. */
function collectSourceFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(abs);
  return out;
}

describe('image placeholder — yerel, ağ isteği yok', () => {
  it('IMAGE_PLACEHOLDER ağ şeması içermez (http/https)', () => {
    expect(IMAGE_PLACEHOLDER).not.toMatch(/^https?:\/\//i);
  });

  it('IMAGE_PLACEHOLDER geçerli bir data URI', () => {
    expect(IMAGE_PLACEHOLDER).toMatch(/^data:image\/(png|jpeg|gif);base64,/);
  });

  it('ölü/üçüncü parti placeholder domain\'leri kaynak ağacında geçmez', () => {
    const files = SCAN_DIRS.flatMap(collectSourceFiles);
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      if (path.resolve(file) === SELF) continue;
      const content = fs.readFileSync(file, 'utf8');
      for (const domain of BANNED_DOMAINS) {
        if (content.includes(domain)) {
          offenders.push(`${path.relative(ROOT, file)} → ${domain}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
