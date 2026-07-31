/**
 * Prod yayın hattı sözleşmesi. Android bilinçli olarak ertelendi (spec §7:
 * Play service account + Firebase çift-client google-services.json gerekiyor).
 * Android submit'i bu önkoşullar karşılanmadan geri eklenirse prod yayını kırar.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const workflow = fs.readFileSync(
  path.join(ROOT, '.github/workflows/mobile-production.yml'),
  'utf8',
);

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
