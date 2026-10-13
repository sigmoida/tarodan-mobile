/**
 * Prod yayın hattı sözleşmesi. Android bilinçli olarak ertelendi (spec §7:
 * Play service account + Firebase çift-client google-services.json gerekiyor).
 * Android submit'i bu önkoşullar karşılanmadan geri eklenirse prod yayını kırar.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const workflow = read('.github/workflows/mobile-production.yml');
const staging = read('.github/workflows/mobile-staging.yml');
const simulator = read('.github/workflows/mobile-build.yml');

/** `on:` bloğunu (ilk üst-seviye anahtara kadar) ayıklar. */
const triggerBlock = (yml: string) => yml.match(/^on:\n([\s\S]*?)^\S/m)?.[1] ?? '';

describe('mobile-production workflow', () => {
  it('yalnız iOS build eder — Android ertelendi', () => {
    expect(workflow).toContain('--platform ios --profile production');
    expect(workflow).not.toContain('--platform all');
    expect(workflow).not.toContain('-p all');
  });

  it('Android submit adımı içermez', () => {
    expect(workflow).not.toContain('eas submit --platform android');
    expect(workflow).not.toContain('eas submit -p android');
  });

  it('iOS submit adımı korunur', () => {
    expect(workflow).toContain(
      'eas submit --platform ios --profile production --latest --non-interactive',
    );
  });

  it('master push ile tetiklenir', () => {
    expect(workflow).toMatch(/branches:\s*\[master\]/);
  });

  it('sürüm kapısı korunur (her master merge build tetiklemez)', () => {
    expect(workflow).toContain("require('./app.json').expo.version");
    expect(workflow).toContain('vergate');
  });

  it('EXPO_TOKEN guard korunur', () => {
    expect(workflow).toContain('secrets.EXPO_TOKEN');
  });
});

/**
 * EAS iOS build kotası aylık 15. Hiçbir workflow kendiliğinden build ALMAMALI —
 * build yalnız insan komutuyla (workflow_dispatch) alınır. OTA bu kurala dahil
 * değildir: kotadan düşmez.
 */
describe('build kotası koruması', () => {
  it('simulator build workflow yalnız elle tetiklenir', () => {
    const on = triggerBlock(simulator);
    expect(on).toContain('workflow_dispatch');
    expect(on).not.toContain('push:');
    expect(on).not.toContain('pull_request:');
  });

  it('staging workflow zamanlanmış (cron) build almaz', () => {
    // Yalnız `on:` bloğuna bakılır — açıklama yorumlarında "cron" geçebilir.
    const on = triggerBlock(staging);
    expect(on).not.toContain('schedule');
    expect(on).not.toContain('cron');
  });

  it('staging otomatik build moduna DÜŞEMEZ', () => {
    // Değişmez: mod çıktısına build YALNIZ elle tetiklemeden gelebilir, yani
    // `mode=${DISPATCH_MODE}` üzerinden. Sabit `mode=build` yazan bir satır
    // olsaydı push veya cron o yoldan otomatik build alabilirdi.
    expect(staging).not.toMatch(/echo "mode=build" >> "\$GITHUB_OUTPUT"/);
    expect(staging).toMatch(/echo "mode=\$\{DISPATCH_MODE\}" >> "\$GITHUB_OUTPUT"/);
    expect(staging).toMatch(/echo "mode=ota" >> "\$GITHUB_OUTPUT"/);
    expect(staging).toMatch(/echo "mode=none" >> "\$GITHUB_OUTPUT"/);
  });

  it('staging native değişiklikte kullanıcıyı elle build almaya yönlendirir', () => {
    expect(staging).toContain('::warning::');
    expect(staging).toContain('-f mode=build');
  });

  it('prod build yalnız sürüm kapısı veya elle tetikleme ile çalışır', () => {
    // Build adımının koşulu: vergate geçti VEYA workflow_dispatch.
    expect(workflow).toMatch(
      /EAS build \(iOS, production\)[\s\S]*?if:[\s\S]*?vergate\.outputs\.changed == 'true' \|\| github\.event_name == 'workflow_dispatch'/,
    );
  });
});

/**
 * OTA/build sınıflandırıcı (`native_re`): native config'i değiştiren her dosya
 * regex'te olmalı, yoksa fingerprint değişir ama workflow "OTA" der ve güncelleme
 * binary'ye ulaşmaz. `app.config.js` `src/lib/deeplinks/paths.json`'dan staging
 * host'larını okuduğu için bu dosya da native sayılır.
 */
describe('staging OTA sınıflandırıcısı (native_re)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { spawnSync } = require('child_process') as typeof import('child_process');
  const nativeRe = staging.match(/native_re='([^']+)'/)?.[1] ?? '';
  const isNative = (file: string) =>
    spawnSync('grep', ['-qE', nativeRe], { input: `${file}\n` }).status === 0;

  it('regex workflow\'dan okunabildi', () => {
    expect(nativeRe).not.toBe('');
  });

  it.each([
    'package.json',
    'app.json',
    'app.config.js',
    'eas.json',
    'plugins/withLegacyStoragePermissions.js',
    'src/lib/deeplinks/paths.json',
  ])('%s native sayılır (OTA gitmez)', (file) => {
    expect(isNative(file)).toBe(true);
  });

  it.each([
    'src/lib/deeplinks/index.ts',
    'src/lib/deeplinks/paths.json.bak',
    'src/lib/deeplinks/other/paths.json',
    'app/sayfa/[slug].tsx',
    'docs/EAS_UPDATE_OTA.md',
  ])('%s JS/OTA\'lık', (file) => {
    expect(isNative(file)).toBe(false);
  });

  it('app.config.js\'in okuduğu her yerel dosya regex\'te', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'app.config.js'), 'utf8');
    const required = [...cfg.matchAll(/require\('\.\/([^']+)'\)/g)].map((m) => m[1]!);
    expect(required).toContain('src/lib/deeplinks/paths.json');
    for (const rel of required) expect({ rel, native: isNative(rel) }).toEqual({ rel, native: true });
  });
});
