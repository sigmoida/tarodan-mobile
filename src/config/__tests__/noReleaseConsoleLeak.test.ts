/**
 * Release'te konsol sızıntısı: `src` ve `app` (testler hariç) içinde ham `console.*`
 * ile değişken veri (token, e-posta, yanıt gövdesi, hata nesnesi) basılmaz.
 *
 * Kural `__DEV__` yakınlığına BAKMAZ (`!__DEV__` ve yorumlar da "korumalı" sayılıyordu):
 *   - `console.log/info/debug/trace` yalnız sabit metinle çağrılabilir.
 *   - `console.warn/error` yalnız sabit metin ve `safeError(...)` özeti alabilir
 *     (ham hata nesnesi AxiosError ise Authorization başlığını ve yanıt gövdesini taşır).
 *   - `.catch(console.error)` gibi başvurular da ham hata basar, yasak.
 * Değişkenli günlük için `logger.debug` (release'te düşer) ya da `logger.error` +
 * `safeError` kullanılır (`@/services/logger`).
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const DIRS = ['src', 'app'];
const SKIP = [/__tests__/, /\.test\.tsx?$/];
// Kapsam dışı (gerekçeli, azaltılmalı; bu liste çürümesin diye aşağıda doğrulanıyor):
//  - logger altyapısı: ConsoleSink bilerek `console.*` kullanır (hata nesnesini release'te özetler).
//  - sentry.ts: `services/logger` bu dosyayı import eder; geri import döngü olur.
const ALLOWLIST = ['src/lib/logger/', 'src/services/sentry.ts'];

/** Yorumları boşlukla, string/template METİNLERİNİ 'S' ile maskeler; uzunluk ve satırlar korunur. */
export function toSkeleton(src: string): string {
  let out = '';
  let mode: 'code' | 'sq' | 'dq' | 'tpl' | 'line' | 'block' = 'code';
  let depth = 0;
  const tpl: number[] = [];
  const mask = (c: string, ch: string) => (c === '\n' ? '\n' : ch);
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    switch (mode) {
      case 'line':
        if (c === '\n') { mode = 'code'; out += c; } else out += ' ';
        break;
      case 'block':
        if (c === '*' && n === '/') { out += '  '; i++; mode = 'code'; } else out += mask(c, ' ');
        break;
      case 'sq':
      case 'dq':
        if (c === '\\') { out += 'S' + mask(n ?? '', 'S'); i++; }
        else if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"')) { out += c; mode = 'code'; }
        else if (c === '\n') { out += c; mode = 'code'; } // kapanmamış (JSX metni apostrofu) toparla
        else out += 'S';
        break;
      case 'tpl':
        if (c === '\\') { out += 'S' + mask(n ?? '', 'S'); i++; }
        else if (c === '`') { out += c; mode = 'code'; }
        else if (c === '$' && n === '{') { out += '${'; i++; tpl.push(depth); mode = 'code'; }
        else out += mask(c, 'S');
        break;
      default: // code
        if (c === '/' && n === '/') { out += '  '; i++; mode = 'line'; }
        else if (c === '/' && n === '*') { out += '  '; i++; mode = 'block'; }
        else if (c === "'") { out += c; mode = 'sq'; }
        else if (c === '"') { out += c; mode = 'dq'; }
        else if (c === '`') { out += c; mode = 'tpl'; }
        else if (c === '{') { depth++; out += c; }
        else if (c === '}') {
          if (tpl.length && tpl[tpl.length - 1] === depth) { tpl.pop(); mode = 'tpl'; } else depth--;
          out += c;
        } else out += c;
    }
  }
  return out;
}

const CALL = /\bconsole\s*\.\s*(log|info|debug|trace|warn|error)\s*\(/g;
const REFERENCE = /[(,]\s*console\s*\.\s*(log|info|debug|trace|warn|error)\s*(?=[),])/g;

function splitArgs(argText: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let cur = '';
  for (const c of argText) {
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    if (c === ',' && depth === 0) { args.push(cur); cur = ''; } else cur += c;
  }
  if (cur.trim()) args.push(cur);
  return args;
}

/** Sabit metin (ya da sabit metinlerin `+` ile birleşimi) mi? İskelette metinler 'S' ile dolu. */
const isLiteral = (arg: string) => arg.replace(/(['"])S*\1|`S*`/g, '').replace(/[\s+]/g, '') === '';
const isSafeSummary = (arg: string) => /^\s*safeError\s*\(/.test(arg);

export interface Leak { line: number; call: string }

export function findRawConsoleLeaks(src: string): Leak[] {
  const skel = toSkeleton(src);
  const leaks: Leak[] = [];
  const lineOf = (idx: number) => skel.slice(0, idx).split('\n').length;
  let m: RegExpExecArray | null;

  CALL.lastIndex = 0;
  while ((m = CALL.exec(skel))) {
    const method = m[1];
    const open = m.index + m[0].length;
    let depth = 1;
    let j = open;
    while (j < skel.length && depth > 0) {
      if ('([{'.includes(skel[j])) depth++;
      else if (')]}'.includes(skel[j])) depth--;
      j++;
    }
    const args = splitArgs(skel.slice(open, j - 1));
    const strict = method === 'warn' || method === 'error';
    const dynamic = args.some((a) => !isLiteral(a) && !(strict && isSafeSummary(a)));
    if (dynamic) leaks.push({ line: lineOf(m.index), call: `console.${method}(…)` });
  }

  REFERENCE.lastIndex = 0;
  while ((m = REFERENCE.exec(skel))) leaks.push({ line: lineOf(m.index), call: `console.${m[1]} başvurusu` });
  return leaks.sort((a, b) => a.line - b.line);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const lines = (src: string) => findRawConsoleLeaks(src).map((l) => l.line);

describe('findRawConsoleLeaks (tarayıcının kendi sınaması)', () => {
  describe('yakalamalı (yanlış negatif olmamalı)', () => {
    it.each([
      ["console.log('x', token);", 'değişkenli log'],
      ["if (__DEV__) console.log('x', token);", '__DEV__ koruması artık geçerli değil'],
      ["if (!__DEV__) console.log('x', token);", '!__DEV__ koruma sayılmaz'],
      ["// __DEV__ burada\nconsole.log('x', token);", 'yorumdaki __DEV__ koruma sayılmaz'],
      ["/* __DEV__ */ console.log(token);", 'blok yorumdaki __DEV__'],
      ['console.log(`token=${token}`);', 'şablonda enterpolasyon'],
      ["console.info('x', a);", 'info'],
      ["console.debug(obj);", 'debug'],
      ["console.error('Failed:', err);", 'ham hata nesnesi'],
      ["console.warn(e);", 'tek ham argüman'],
      ["console.error('x', err.response?.data);", 'yanıt gövdesi'],
      ["console.error('x', JSON.stringify(err));", 'safeError olmayan çağrı'],
      ["promise.catch(console.error);", 'başvuru olarak geçirme'],
      ["x.then(a, console.log);", 'başvuru olarak geçirme (2. argüman)'],
      ["console.log(\n  'uzun',\n  token,\n);", 'çok satırlı'],
      ["console.log('a' + token);", 'birleştirme'],
      ["console . log ( 'x', token )", 'boşluklu yazım'],
      ["const s = `${a}`; console.log('ok'); console.log(s);", 'sonraki çağrı yakalanır'],
    ])('%s -> %s', (code) => {
      expect(findRawConsoleLeaks(code).length).toBeGreaterThan(0);
    });

    it('satır numarasını doğru verir (yorum ve metinler satır saymayı bozmaz)', () => {
      const code = "// a\n/* b\nc */\nconst s = 'x\\'y';\nconsole.log('t', token);";
      expect(lines(code)).toEqual([5]);
    });

    it('metin içindeki `)` ve `//` argüman ayrıştırmasını bozmaz', () => {
      expect(lines("console.log('http://x.com/a)', token);")).toEqual([1]);
      expect(lines("console.error('a, b)', err);")).toEqual([1]);
    });
  });

  describe('geçirmeli (yanlış pozitif olmamalı)', () => {
    it.each([
      ["console.log('sabit metin');", 'sabit metin'],
      ['console.log("çift tırnak");', 'çift tırnak'],
      ['console.log(`şablon ama enterpolasyonsuz`);', 'şablon, enterpolasyonsuz'],
      ["console.log('a' + 'b');", 'sabit birleşim'],
      ["console.warn('[maestro] eksik — ' +\n  'ikisini de ekleyin');", 'çok satırlı sabit birleşim'],
      ["console.error('x', safeError(err));", 'güvenli özet'],
      ["console.warn('x', safeError(err, extra));", 'güvenli özet, iç içe parantez'],
      ["// console.log(token);", 'satır yorumu'],
      ["/* console.log(token); */", 'blok yorum'],
      ["const s = \"console.log(token)\";", 'metin içinde'],
      ["const s = `console.error(err) ${1}`;", 'şablon metni içinde'],
      ["logger.debug('x', { token });", 'logger kullanımı'],
      ["const log = (...a) => logger.debug('x', a);", 'başka fonksiyon'],
      ["console.error = (...args) => orig(...args);", 'atama (yama), çağrı değil'],
      ["const orig = console.error.bind(console);", 'bind'],
      ["<Text>Kullanıcı'nın</Text>;\nconsole.log('ok');", 'JSX metnindeki kapanmamış apostrof toparlanır'],
    ])('%s -> %s', (code) => {
      expect(findRawConsoleLeaks(code)).toEqual([]);
    });
  });
});

describe('src ve app: ham konsol sızıntısı yok', () => {
  const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)))
    .map((f) => path.relative(ROOT, f))
    .filter((rel) => !SKIP.some((r) => r.test(rel)));

  it('tarama gerçekten dosya buluyor (boş tarama sahte yeşil vermesin)', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('değişkenli console.* çağrısı (ya da başvurusu) bulunmaz', () => {
    const offenders: string[] = [];
    for (const rel of files) {
      if (ALLOWLIST.some((a) => rel.startsWith(a))) continue;
      for (const l of findRawConsoleLeaks(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
        offenders.push(`${rel}:${l.line} ${l.call}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('allowlist çürümez: her giriş hâlâ gerçekten ihlal içeriyor', () => {
    for (const entry of ALLOWLIST) {
      const hit = files
        .filter((rel) => rel.startsWith(entry))
        .some((rel) => findRawConsoleLeaks(fs.readFileSync(path.join(ROOT, rel), 'utf8')).length > 0);
      expect({ entry, hit }).toEqual({ entry, hit: true });
    }
  });
});
