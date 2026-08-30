#!/usr/bin/env node
/**
 * Yayindaki dogrulama dosyalarini olcer. Tek basina "dosya var mi" yetmez:
 * Apple yonlendirmeyi ve yanlis content-type'i SESSIZCE reddeder, cihazlar
 * dosyayi origin'den degil Apple CDN'inden ceker, Android tarafinda eksik
 * parmak izi dogrulamayi sessizce dusurur. Hepsini ayri ayri sorar.
 *
 * Kullanim: node scripts/check-deeplinks.mjs
 * Cikis kodu: herhangi bir kontrol basarisizsa 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/wellknown');
const config = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/lib/deeplinks/paths.json'), 'utf8'),
);

// Bu script web/infra ekibine veriliyor; baglantilari kara deliğe atan bir WAF
// arkasinda kosabilir. Zaman asimi olmadan tek bir asili baglanti script'i
// ciktisiz kilitler.
const TIMEOUT_MS = 10_000;

const results = [];
// Her satir URETILDIGI ANDA basilir: dongude bir istisna cikarsa o ana kadar
// olculen sonuclar kaybolmasin, asili bir istekte ilerleme gorunsun.
const record = (host, check, ok, detail) => {
  results.push({ host, check, ok, detail });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${host.padEnd(26)} ${check.padEnd(32)} ${detail}`);
};

const readLocal = (name) => {
  const file = path.join(OUT_DIR, name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
};

async function fetchNoRedirect(url) {
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = res.status === 200 ? await res.text() : '';
    return { status: res.status, type: res.headers.get('content-type') ?? '', body };
  } catch (err) {
    return { status: 0, type: '', body: '', error: String(err) };
  }
}

const expectedAasa = readLocal('apple-app-site-association');
const expectedLinks = readLocal('assetlinks.json');

console.log('');
for (const host of config.hosts) {
  const aasa = await fetchNoRedirect(`https://${host}/.well-known/apple-app-site-association`);
  record(host, 'AASA 200', aasa.status === 200, `HTTP ${aasa.status}${aasa.error ?? ''}`);
  record(host, 'AASA content-type json', aasa.type.includes('application/json'), aasa.type || '(yok)');
  record(host, 'AASA yonlendirme yok', ![301, 302, 303, 307, 308].includes(aasa.status), `HTTP ${aasa.status}`);
  if (aasa.status === 200 && expectedAasa) {
    let same = false;
    try {
      same = JSON.stringify(JSON.parse(aasa.body)) === JSON.stringify(expectedAasa);
    } catch {
      same = false;
    }
    record(host, 'AASA icerik uretilenle ayni', same, same ? 'ayni' : 'FARKLI');
  } else {
    record(host, 'AASA icerik uretilenle ayni', false, 'karsilastirilamadi');
  }

  const links = await fetchNoRedirect(`https://${host}/.well-known/assetlinks.json`);
  record(host, 'assetlinks 200', links.status === 200, `HTTP ${links.status}${links.error ?? ''}`);
  if (links.status === 200 && expectedLinks) {
    const served = links.body;
    const missing = expectedLinks[0].target.sha256_cert_fingerprints.filter(
      (fp) => !served.includes(fp),
    );
    record(host, 'assetlinks parmak izleri tam', missing.length === 0, missing.join(', ') || 'tam');
  } else {
    record(host, 'assetlinks parmak izleri tam', false, expectedLinks ? 'karsilastirilamadi' : 'yerel dosya yok');
  }

  const cdn = await fetchNoRedirect(`https://app-site-association.cdn-apple.com/a/v1/${host}`);
  record(host, 'Apple CDN gordu', cdn.status === 200, `HTTP ${cdn.status}`);

  const gUrl =
    'https://digitalassetlinks.googleapis.com/v1/statements:list' +
    `?source.web.site=https://${host}` +
    '&relation=delegate_permission%2Fcommon.handle_all_urls';
  const google = await fetchNoRedirect(gUrl);
  let gOk = false;
  let gDetail = `HTTP ${google.status}`;
  if (google.status === 200) {
    try {
      const parsed = JSON.parse(google.body);
      gOk = Array.isArray(parsed.statements) && parsed.statements.length > 0;
      gDetail = gOk ? `${parsed.statements.length} statement` : (parsed.errorCode ?? 'statement yok');
    } catch {
      gDetail = 'yanit ayristirilamadi';
    }
  }
  record(host, 'Google dogrulayici', gOk, gDetail);
}

const pending = config.paths.filter((p) => !p.confirmed);
console.log('');
if (pending.length > 0) {
  console.log(`TEYIT BEKLEYEN ${pending.length} yol (yayina konmadi): ${pending.map((p) => p.pattern).join(', ')}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} kontrol gecti.`);
process.exit(failed > 0 ? 1 : 0);
