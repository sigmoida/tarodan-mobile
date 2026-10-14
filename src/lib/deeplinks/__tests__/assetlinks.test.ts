/**
 * scripts/gen-wellknown.mjs — Android assetlinks üretimi (iki uygulamalı model).
 *
 * Script geçici bir dizine yazdırılır (`--out-dir`/`--fingerprints`), böylece
 * repodaki docs/wellknown dosyalarına dokunmadan her senaryo denenir.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { deepLinkConfig, productionHosts } from '../index';

const ROOT = path.resolve(__dirname, '../../../..');
const SCRIPT = path.join(ROOT, 'scripts/gen-wellknown.mjs');
const fp = (b: string) => Array.from({ length: 32 }, () => b).join(':');
const PROD_UPLOAD = fp('AA');
const PROD_PLAY = fp('BB');
const STG_UPLOAD = fp('CC');
const STG_PLAY = fp('DD');

type Entry = { package?: string; sha256: string };
const tmpDirs: string[] = [];
afterAll(() => tmpDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

function generate(fingerprints: Record<string, Entry | string>, extraArgs: string[] = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wellknown-'));
  tmpDirs.push(dir);
  const fpFile = path.join(dir, 'fingerprints.json');
  fs.writeFileSync(fpFile, JSON.stringify(fingerprints));
  const res = spawnSync('node', [SCRIPT, '--out-dir', dir, '--fingerprints', fpFile, ...extraArgs], {
    encoding: 'utf8',
  });
  const read = (name: string) => {
    const f = path.join(dir, name);
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
  };
  return { code: res.status, out: res.stdout, err: res.stderr, prod: read('assetlinks.json'), staging: read('assetlinks.staging.json') };
}

const full = {
  _format: 'açıklama alanı',
  eas_upload_keystore: { package: 'com.tarodan.app', sha256: PROD_UPLOAD },
  play_app_signing: { package: 'com.tarodan.app', sha256: PROD_PLAY },
  staging_eas_upload_keystore: { package: 'com.tarodan.app.staging', sha256: STG_UPLOAD },
  staging_play_app_signing: { package: 'com.tarodan.app.staging', sha256: STG_PLAY },
};

describe('paths.json — Android paketleri', () => {
  it('production com.tarodan.app, staging com.tarodan.app.staging', () => {
    expect(deepLinkConfig.androidPackage).toBe('com.tarodan.app');
    expect(deepLinkConfig.stagingAndroidPackage).toBe('com.tarodan.app.staging');
    expect(deepLinkConfig.stagingAndroidPackage).toBe(`${deepLinkConfig.androidPackage}.staging`);
  });
});

describe('gen-wellknown — assetlinks (iki paket)', () => {
  it('production dosyası YALNIZ production paketini, staging dosyası YALNIZ staging paketini yetkilendirir', () => {
    const r = generate(full);
    expect(r.code).toBe(0);
    expect(r.prod).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.tarodan.app',
          sha256_cert_fingerprints: [PROD_UPLOAD, PROD_PLAY],
        },
      },
    ]);
    expect(r.staging).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.tarodan.app.staging',
          sha256_cert_fingerprints: [STG_UPLOAD, STG_PLAY],
        },
      },
    ]);
    // parmak izleri paketler arasında SIZMAZ
    expect(JSON.stringify(r.prod)).not.toContain(STG_UPLOAD);
    expect(JSON.stringify(r.staging)).not.toContain(PROD_UPLOAD);
  });

  it('production host\'u ve staging host\'u ayrı dosyalara karşılık gelir', () => {
    expect(productionHosts()).toEqual(['tarodan.com.tr']);
    expect(deepLinkConfig.stagingHosts).toEqual(['staging.tarodan.com.tr']);
  });

  it('Play App Signing alanları BOŞ bırakılabilir: yalnız dolu olanlar yazılır', () => {
    const r = generate({
      ...full,
      play_app_signing: { package: 'com.tarodan.app', sha256: '' },
      staging_play_app_signing: { package: 'com.tarodan.app.staging', sha256: '' },
    });
    expect(r.code).toBe(0);
    expect(r.prod[0].target.sha256_cert_fingerprints).toEqual([PROD_UPLOAD]);
    expect(r.staging[0].target.sha256_cert_fingerprints).toEqual([STG_UPLOAD]);
  });

  it('`package` alanı olmayan girdi production sayılır (eski biçim)', () => {
    const r = generate({ eas_upload_keystore: { sha256: PROD_UPLOAD } });
    expect(r.code).toBe(0);
    expect(r.prod[0].target.package_name).toBe('com.tarodan.app');
    expect(r.staging).toBeNull();
  });

  it('staging parmak izi yoksa staging dosyası YAZILMAZ (boş liste yayınlanmaz), uyarı verir', () => {
    const r = generate({ eas_upload_keystore: { package: 'com.tarodan.app', sha256: PROD_UPLOAD } });
    expect(r.code).toBe(0);
    expect(r.staging).toBeNull();
    expect(r.err).toMatch(/assetlinks\.staging\.json YAZILMADI/);
  });

  it('--strict: production parmak izi yoksa çıkış 1', () => {
    const r = generate({ staging_eas_upload_keystore: { package: 'com.tarodan.app.staging', sha256: STG_UPLOAD } }, ['--strict']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/assetlinks\.json YAZILMADI/);
  });

  it('--strict: yalnız staging eksikse sürüm kapısı AÇIK kalır', () => {
    const r = generate({ eas_upload_keystore: { package: 'com.tarodan.app', sha256: PROD_UPLOAD } }, ['--strict']);
    expect(r.code).toBe(0);
  });

  it('geçersiz biçim (küçük harf / TODO) hata verir', () => {
    expect(generate({ staging_eas_upload_keystore: { package: 'com.tarodan.app.staging', sha256: fp('aa') } }).code).toBe(1);
    expect(generate({ eas_upload_keystore: { package: 'com.tarodan.app', sha256: 'TODO' } }).code).toBe(1);
  });

  it('bilinmeyen paket adı hata verir (yanlış pakete parmak izi yazılmaz)', () => {
    const r = generate({ x: { package: 'com.baska.app', sha256: PROD_UPLOAD } });
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/bilinmeyen paket/);
  });
});

describe('docs/wellknown/fingerprints.json (repodaki)', () => {
  const file = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs/wellknown/fingerprints.json'), 'utf8'),
  ) as Record<string, Entry | string>;
  const entries = Object.entries(file).filter(([k]) => !k.startsWith('_')) as Array<[string, Entry]>;

  it('her girdi bilinen bir pakete bağlı', () => {
    for (const [, e] of entries) {
      expect([deepLinkConfig.androidPackage, deepLinkConfig.stagingAndroidPackage]).toContain(e.package);
    }
  });

  it('staging: upload + Play App Signing dolu (Play birden çok imzalama sertifikası verebilir); production Play henüz boş', () => {
    const staging = entries.filter(([, e]) => e.package === deepLinkConfig.stagingAndroidPackage);
    const keys = staging.map(([k]) => k);
    expect(keys).toContain('staging_eas_upload_keystore');
    expect(keys).toContain('staging_play_app_signing');
    for (const [k] of staging) expect(k).toMatch(/^staging_(eas_upload_keystore|play_app_signing(_\d+)?)$/);
    for (const [, e] of staging) expect(e.sha256).not.toBe('');
    expect(file.play_app_signing).toMatchObject({ sha256: '' });
  });

  it('production upload parmak izi staging girdisine KOPYALANMAMIŞ (EAS keystore paket başına)', () => {
    const prodUpload = (file.eas_upload_keystore as Entry).sha256;
    expect(prodUpload).not.toBe('');
    for (const [k, e] of entries) {
      if (e.package === deepLinkConfig.stagingAndroidPackage) expect({ k, v: e.sha256 }).not.toEqual({ k, v: prodUpload });
    }
  });
});

describe('repodaki üretilmiş assetlinks.json', () => {
  it('yalnız production paketini yetkilendirir', () => {
    const links = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/wellknown/assetlinks.json'), 'utf8'));
    expect(links).toHaveLength(1);
    expect(links[0].target.package_name).toBe('com.tarodan.app');
  });

  it('boş parmak izi listesiyle staging dosyası yayınlanmaz', () => {
    const f = path.join(ROOT, 'docs/wellknown/assetlinks.staging.json');
    if (!fs.existsSync(f)) return;
    const links = JSON.parse(fs.readFileSync(f, 'utf8'));
    expect(links[0].target.package_name).toBe('com.tarodan.app.staging');
    expect(links[0].target.sha256_cert_fingerprints.length).toBeGreaterThan(0);
  });
});

/**
 * scripts/check-deeplinks.mjs — staging parmak izleri dolmadan staging
 * assetlinks kontrolleri ATLANIR (uyarı), production raporlanmaya devam eder.
 * Ağ, fixtures/fakeFetch.cjs ile taklit edilir.
 */
describe('check-deeplinks — staging parmak izi bekleniyorken', () => {
  const CHECK = path.join(ROOT, 'scripts/check-deeplinks.mjs');
  const STUB = path.join(__dirname, 'fixtures/fakeFetch.cjs');
  const PROD_HOST = 'tarodan.com.tr';
  const STG_HOST = 'staging.tarodan.com.tr';
  const SKIP_MSG = 'atlandı (parmak izi bekleniyor)';

  const prodOnly = {
    eas_upload_keystore: { package: 'com.tarodan.app', sha256: PROD_UPLOAD },
    play_app_signing: { package: 'com.tarodan.app', sha256: PROD_PLAY },
    staging_eas_upload_keystore: { package: 'com.tarodan.app.staging', sha256: '' },
  };

  function check(fingerprints: Record<string, Entry>, env: Record<string, string> = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wellknown-check-'));
    tmpDirs.push(dir);
    const fpFile = path.join(dir, 'fingerprints.json');
    fs.writeFileSync(fpFile, JSON.stringify(fingerprints));
    const gen = spawnSync('node', [SCRIPT, '--out-dir', dir, '--fingerprints', fpFile], { encoding: 'utf8' });
    expect(gen.status).toBe(0);
    const res = spawnSync('node', ['-r', STUB, CHECK, '--out-dir', dir], {
      encoding: 'utf8',
      env: { ...process.env, STUB_DIR: dir, ...env },
    });
    const lines = res.stdout.split('\n');
    return {
      code: res.status,
      out: res.stdout,
      fetched: res.stderr.split('\n').filter((l) => l.startsWith('FETCH ')).map((l) => l.slice(6)),
      lineFor: (host: string, check: string) => lines.find((l) => l.includes(host) && l.includes(check)),
      fails: lines.filter((l) => l.startsWith('FAIL')),
    };
  }

  it('staging assetlinks/Google kontrolleri ATLANIR (uyarı), komut BAŞARISIZ OLMAZ', () => {
    const r = check(prodOnly);
    expect(r.code).toBe(0);
    expect(r.fails).toEqual([]);
    for (const c of ['assetlinks 200', 'assetlinks parmak izleri tam', 'Google dogrulayici']) {
      expect(r.lineFor(STG_HOST, c)).toContain(SKIP_MSG);
    }
    expect(r.out).toMatch(/UYARI: 3 kontrol ATLANDI/);
    expect(r.out).toMatch(/\d+\/\d+ kontrol gecti, 3 atlandı\./);
  });

  it('atlanan kontroller için staging\'e hiç istek atılmaz', () => {
    const r = check(prodOnly);
    expect(r.fetched).not.toContain(`https://${STG_HOST}/.well-known/assetlinks.json`);
    expect(r.fetched.some((u) => u.includes(`source.web.site=https://${STG_HOST}`))).toBe(false);
    // staging AASA yine sorulur
    expect(r.fetched).toContain(`https://${STG_HOST}/.well-known/apple-app-site-association`);
  });

  it('production kontrolleri raporlanmaya devam eder', () => {
    const r = check(prodOnly);
    for (const c of ['AASA 200', 'assetlinks 200', 'assetlinks parmak izleri tam', 'Apple CDN gordu', 'Google dogrulayici']) {
      expect(r.lineFor(PROD_HOST, c)).toMatch(/^OK /);
    }
  });

  it('production bozukken staging atlanmış olsa da FAIL + çıkış 1', () => {
    const r = check(prodOnly, { STUB_BREAK_PROD: '1' });
    expect(r.code).toBe(1);
    expect(r.lineFor(PROD_HOST, 'assetlinks 200')).toMatch(/^FAIL/);
    expect(r.lineFor(STG_HOST, 'assetlinks 200')).toContain(SKIP_MSG);
  });

  it('production için yerel assetlinks yoksa atlanmaz: FAIL (mazeret yalnız staging için)', () => {
    const r = check({ eas_upload_keystore: { package: 'com.tarodan.app', sha256: '' } });
    expect(r.code).toBe(1);
    expect(r.lineFor(PROD_HOST, 'assetlinks parmak izleri tam')).toMatch(/^FAIL.*yerel dosya yok/);
  });

  it('staging parmak izleri dolunca staging gerçekten karşılaştırılır (atlama yok)', () => {
    const r = check({
      ...prodOnly,
      staging_eas_upload_keystore: { package: 'com.tarodan.app.staging', sha256: STG_UPLOAD },
    });
    expect(r.code).toBe(0);
    expect(r.out).not.toContain('atlandı');
    expect(r.lineFor(STG_HOST, 'assetlinks parmak izleri tam')).toMatch(/^OK /);
    expect(r.fetched).toContain(`https://${STG_HOST}/.well-known/assetlinks.json`);
  });
});
