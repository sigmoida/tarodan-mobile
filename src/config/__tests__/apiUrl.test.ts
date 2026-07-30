/**
 * Ortam yapılandırması regresyonu: `tarodan.shop` domain ailesi NXDOMAIN
 * (2026-07-30 doğrulandı) — hiçbir profil bu adrese dönmemeli. Canlı staging
 * API'si `staging.tarodan.com.tr/api`.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('ortam API adresleri', () => {
  it('hiçbir yapılandırma dosyasında ölü tarodan.shop domaini kalmadı', () => {
    for (const file of ['.env', '.env.example', 'eas.json', '.github/workflows/mobile-staging.yml']) {
      expect(read(file)).not.toContain('tarodan.shop');
    }
  });

  it('eas.json preview ve staging profilleri canlı staging API adresini kullanır', () => {
    const eas = JSON.parse(read('eas.json'));
    expect(eas.build.preview.env.EXPO_PUBLIC_API_URL).toBe(
      'https://staging.tarodan.com.tr/api',
    );
    expect(eas.build.staging.env.EXPO_PUBLIC_API_URL).toBe(
      'https://staging.tarodan.com.tr/api',
    );
  });

  it('eas.json production profili hedef production API adresini kullanır', () => {
    const eas = JSON.parse(read('eas.json'));
    expect(eas.build.production.env.EXPO_PUBLIC_API_URL).toBe(
      'https://tarodan.com.tr/api',
    );
  });
});
