/**
 * Release'te `console.log` sızıntısı: değişken veri (token, e-posta, yanıt gövdesi,
 * hata nesnesi) basan her `console.log` `__DEV__` arkasında olmalı. Yalnız sabit
 * metin basanlar serbest. `console.warn/error`'a dokunulmaz.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const DIRS = ['src', 'app'];
// Günlükleyici altyapısı: seviyeye göre (minLevel) süzülür, burada kapsam dışı.
const SKIP = [/__tests__/, /src\/lib\/logger\//];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const LITERAL_ONLY = /^\s*(["'`])(?:(?!\1)[^\\$]|\\.)*\1\s*,?\s*$/;

export function findUnguardedConsoleLogs(src: string): number[] {
  const lines = src.split('\n');
  const found: number[] = [];
  const re = /console\.log\(([\s\S]*?)\);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (LITERAL_ONLY.test(m[1])) continue;
    const line = src.slice(0, m.index).split('\n').length;
    if (!/__DEV__/.test(lines.slice(Math.max(0, line - 4), line).join('\n'))) found.push(line);
  }
  return found;
}

describe('console.log __DEV__ kapısı', () => {
  it('tarayıcı: korumasız değişkenli log yakalanır, korumalı ve sabit metin geçer', () => {
    expect(findUnguardedConsoleLogs("console.log('x', token);")).toEqual([1]);
    expect(findUnguardedConsoleLogs("if (__DEV__) console.log('x', token);")).toEqual([]);
    expect(findUnguardedConsoleLogs("console.log('sabit metin');")).toEqual([]);
    expect(findUnguardedConsoleLogs("if (__DEV__) {\n  console.log(\n    'x', a);\n}")).toEqual([]);
  });

  it('değişken veri basan console.log __DEV__ dışında kalmaz', () => {
    const offenders: string[] = [];
    for (const d of DIRS) {
      for (const file of walk(path.join(ROOT, d))) {
        const rel = path.relative(ROOT, file);
        if (SKIP.some((r) => r.test(rel))) continue;
        for (const line of findUnguardedConsoleLogs(fs.readFileSync(file, 'utf8'))) {
          offenders.push(`${rel}:${line}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
