/**
 * Çevrilmemiş Türkçe metin tarayıcısı.
 *
 * ÖNEMLİ: bu betiğin ilk hâli yalnız TIRNAK İÇİNDEKİ metinleri sayıyordu ve
 * `<Text>Merhaba</Text>` gibi JSX metin düğümlerini HİÇ görmüyordu. Bu yüzden
 * on beş dilim boyunca "bitti" denen ekranlarda 101 metin kaldı ve ancak elle
 * test sırasında görüldü. `jsxRx` o kör noktayı kapatıyor — kaldırmayın.
 *
 * `DELIB` listesi bilerek çevrilmeyenler: yer adları, ana repo aynası dosyalar,
 * satır içi {tr,en} çifti taşıyan biçimlendiriciler, hukuki künye, test verisi.
 *
 * Kullanım: node scripts/scan-untranslated.mjs
 */
import {readFileSync} from 'fs';
import {execSync} from 'child_process';
const files = execSync("find app src -name '*.ts' -o -name '*.tsx'").toString().trim().split('\n')
  .filter(f => !f.includes('__tests__') && !f.includes('/i18n/'));
const DELIB = /status-configs|utils\/format\.ts|legalFacts|utils\/phone\.ts|ReputationBadge|theme\/catalog|turkeyLocations|test-utils/;
const strRx = /(['"`])((?:(?!\1)[^\\\n]|\\.)*[çğıöşüÇĞİÖŞÜ](?:(?!\1)[^\\\n]|\\.)*)\1/;
// JSX metin düğümü: >...< arası, süslü parantez/etiket içermeyen
const jsxRx = />\s*([^<>{}\n][^<>{}]*[çğıöşüÇĞİÖŞÜ][^<>{}]*?)\s*</;
const out=[];
for (const f of files) {
  if (DELIB.test(f)) continue;
  const lines=readFileSync(f,'utf8').split('\n');
  let block=false; const hits=[];
  for (const line of lines) {
    const tl=line.trim();
    if (tl.startsWith('/*')||tl.startsWith('{/*')) block=true;
    if (block) { if (tl.includes('*/')) block=false; continue; }
    if (tl.startsWith('//')||tl.startsWith('*')) continue;
    const code=line.split('//')[0];
    if (/console\.(log|warn|debug|info)/.test(code)) continue;
    const s=code.match(strRx); if (s && /[a-zA-ZçğıöşüÇĞİÖŞÜ]{3}/.test(s[2])) hits.push(s[2]);
    const j=code.match(jsxRx); if (j && /[a-zA-ZçğıöşüÇĞİÖŞÜ]{3}/.test(j[1])) hits.push(j[1]);
  }
  if (hits.length) out.push([hits.length,f,hits]);
}
out.sort((a,b)=>b[0]-a[0]);
console.log('TOPLAM →', out.reduce((s,x)=>s+x[0],0), 'metin /', out.length, 'dosya\n');
for (const [n,f,h] of out) console.log(n, f, '|', h.slice(0,2).join(' · ').slice(0,70));
