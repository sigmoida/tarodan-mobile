/**
 * Ortam yapılandırması regresyonu: `tarodan.shop` domain ailesi NXDOMAIN
 * (2026-07-30 doğrulandı) — hiçbir profil bu adrese dönmemeli. Canlı staging
 * API'si `staging.tarodan.com.tr/api`.
 */
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

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

  it('mağazaya çıkan her profil canlı bir https API adresi tanımlar', () => {
    // Regresyon: 1.0(2) (2026-07-02, production profili) ölü tarodan.shop'a
    // derlenmişti; DNS çözülmediği için login axios'ta "Network Error" verdi ve
    // App Review 2.1(a)'dan reddetti. Adres eksik kalsaydı istemci sessizce
    // http://localhost:3001/api'ye düşerdi (src/lib/api/client.ts) — aynı belirti.
    // Bu yüzden "tarodan.shop yok" yetmez: store dağıtımı yapan HER profilin
    // adresi TANIMLI, https ve canlı domain ailesinden olmalı.
    const eas = JSON.parse(read('eas.json'));
    const storeProfiles = Object.entries(
      eas.build as Record<string, { distribution?: string; env?: Record<string, string> }>,
    ).filter(([, cfg]) => cfg.distribution === 'store');

    expect(storeProfiles.length).toBeGreaterThan(0);
    for (const [name, cfg] of storeProfiles) {
      const url = cfg.env?.EXPO_PUBLIC_API_URL;
      expect([name, url]).toEqual([name, expect.any(String)]);
      expect([name, url!.startsWith('https://')]).toEqual([name, true]);
      expect([name, /^https:\/\/(staging\.)?tarodan\.com\.tr\/api$/.test(url!)]).toEqual([
        name,
        true,
      ]);
    }
  });

  it('OTA env\'i eas.json profilinden okunur (kopya env bloğu yok)', () => {
    // Regresyon: `eas update` eas.json build profilinin env'ini OKUMAZ. Eskiden
    // workflow'a elle kopyalanan env bloğu preview ile kayınca (I1:
    // EXPO_PUBLIC_WEB_URL eksikliği) paylaşım linkleri production'a gitti. Artık
    // scripts/ci/release.sh env'i doğrudan eas.json'dan yükler; burada o çıktının
    // eas.json ile birebir aynı olduğu doğrulanır.
    const eas = JSON.parse(read('eas.json'));
    for (const profile of ['preview', 'production']) {
      const out = execFileSync('bash', [path.join(ROOT, 'scripts/ci/release.sh'), 'profile-env', profile], {
        encoding: 'utf8',
      });
      const parsed = Object.fromEntries(
        out
          .trim()
          .split('\n')
          .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
      );
      expect([profile, parsed]).toEqual([profile, eas.build[profile].env]);
    }

    const staging = read('.github/workflows/mobile-staging.yml');
    expect(staging).toContain('publish-ota staging "$OTA_PLATFORM" preview');
    expect(staging).not.toMatch(/^\s*EXPO_PUBLIC_API_URL:/m);
  });

  it('preview ve staging profilleri aynı EXPO_PUBLIC_* değerlerini taşır', () => {
    // Tek bir `staging` OTA dalı hem staging (store) hem preview (ad-hoc) build'lerini
    // besliyor ve OTA env'i preview'den yükleniyor. Değerler ayrışırsa staging
    // binary'lerine yanlış env'li JS iner (ya da fingerprint tutmaz).
    const eas = JSON.parse(read('eas.json'));
    const pub = (env: Record<string, string>) =>
      Object.fromEntries(Object.entries(env).filter(([k]) => k.startsWith('EXPO_PUBLIC_')));
    expect(pub(eas.build.staging.env)).toEqual(pub(eas.build.preview.env));
  });
});
