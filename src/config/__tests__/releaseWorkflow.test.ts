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
