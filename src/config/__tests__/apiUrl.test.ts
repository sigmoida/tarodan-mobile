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
    // NOT: '.env' burada denetlenmiyor çünkü .gitignore ile versiyon dışı
    // bırakıldı (bkz. .gitignore:25) — temiz clone/CI'da dosya mevcut değil,
    // readFileSync ENOENT fırlatır ve test yanlışlıkla her zaman kırmızı olur.
    // Versiyonlanan dosyalar (aşağıdaki liste) zaten aynı regresyonu yakalar.
    for (const file of [
      '.env.example',
      'eas.json',
      '.github/workflows/mobile-staging.yml',
      'src/utils/share.ts',
      'src/utils/imageUrl.ts',
      'src/utils/webAssetUrl.ts',
    ]) {
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

  it('OTA workflow env bloğu eas.json preview env anahtarlarının hepsini içerir', () => {
    // Regresyon: OTA job'ı eas.json preview profilinin env'ini OKUMAZ (workflow
    // içi yorum), inline kopyalar. Bir EXPO_PUBLIC_* anahtarı preview'e eklenip
    // buraya kopyalanmazsa OTA build'lerinde o değişken boş kalır (bkz. I1:
    // EXPO_PUBLIC_WEB_URL eksikliği -> paylaşım linkleri production'a gitti).
    const eas = JSON.parse(read('eas.json'));
    const previewKeys = Object.keys(eas.build.preview.env).filter((k) =>
      k.startsWith('EXPO_PUBLIC_'),
    );

    const workflow = read('.github/workflows/mobile-staging.yml');
    const otaJobMatch = workflow.match(
      /ota:\n[\s\S]*?Publish OTA to staging[\s\S]*?env:\n([\s\S]*?)\n\s*run:/,
    );
    expect(otaJobMatch).not.toBeNull();
    const otaEnvBlock = otaJobMatch![1];
    const otaKeys = Array.from(
      otaEnvBlock.matchAll(/^\s*(EXPO_PUBLIC_[A-Z0-9_]+):/gm),
    ).map((m) => m[1]);

    for (const key of previewKeys) {
      expect(otaKeys).toContain(key);
    }
  });
});
