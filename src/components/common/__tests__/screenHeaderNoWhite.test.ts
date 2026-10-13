/**
 * ScreenHeader artık BEYAZ zeminli (web'in sade üst barı). Turuncu bardan kalma beyaz ikon / metin
 * rengi `right` aksiyonunda beyaz zeminde görünmez olur. Bu test, `<ScreenHeader … />` kullanımlarında
 * beyaz renk geçilmesini ve eski `variant` prop'unun geri gelmesini engeller.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');
const SCAN_DIRS = ['app', 'src/components'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** `<ScreenHeader … />` JSX öğelerinin kaynak metni (süslü parantez derinliğine göre). */
function screenHeaderElements(source: string): string[] {
  const found: string[] = [];
  const re = /<ScreenHeader\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 0;
    let j = m.index;
    for (; j < source.length; j++) {
      const c = source[j];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (depth === 0 && c === '/' && source[j + 1] === '>') {
        j += 2;
        break;
      }
    }
    found.push(source.slice(m.index, j));
  }
  return found;
}

const WHITE = /colors\.white|color=["']white["']|text\.inverted|#fff/i;

describe('ScreenHeader kullanımları (beyaz üst bar)', () => {
  const offenders: string[] = [];
  let total = 0;
  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      for (const el of screenHeaderElements(fs.readFileSync(file, 'utf8'))) {
        total++;
        const rel = path.relative(ROOT, file);
        if (WHITE.test(el)) offenders.push(`${rel}: beyaz renk`);
        if (/\bvariant=/.test(el)) offenders.push(`${rel}: kaldırılan variant prop'u`);
      }
    }
  }

  // Yalnız taramanın çalıştığını doğrular: ekranlar PageShell'e geçtikçe doğrudan
  // ScreenHeader kullanımı azalıyor (PageShell içte kendisi kullanır), sabit büyük eşik kırılır.
  it('kullanımlar bulunur (tarama çalışıyor)', () => {
    expect(total).toBeGreaterThan(0);
  });

  it('hiçbirinde beyaz renk ya da variant yok', () => {
    expect(offenders).toEqual([]);
  });
});
