/**
 * Android izin sözleşmesi.
 *
 * expo-image-picker@17, Android 12 ve altında (API < 33) galeri izni için tam
 * olarak WRITE_EXTERNAL_STORAGE + READ_EXTERNAL_STORAGE ister. Bunlar manifestte
 * yoksa sistem isteği sessizce reddeder ve ilan fotoğrafı / mesaj görseli / iade
 * kanıtı eklenemez. Bu yüzden `blockedPermissions` ile SİLİNMEZ;
 * `withLegacyStoragePermissions` plugin'i `maxSdkVersion=32` ile daraltır.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const { expo } = JSON.parse(read('app.json')) as {
  expo: {
    android: { permissions?: string[]; blockedPermissions?: string[] };
    plugins: Array<string | [string, Record<string, unknown>]>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require('../../../plugins/withLegacyStoragePermissions') as {
  applyLegacyStoragePermissions: (m: ManifestLike) => ManifestLike;
  PERMISSIONS: string[];
  MAX_SDK: string;
};

type Perm = { $: Record<string, string> };
type ManifestLike = { manifest: { $?: Record<string, string>; 'uses-permission'?: Perm[] } };

const STORAGE = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

describe('expo-image-picker Android davranışı (kaynak doğrulaması)', () => {
  const lib = (rel: string) =>
    fs.readFileSync(path.join(ROOT, 'node_modules/expo-image-picker/android', rel), 'utf8');

  it('API < 33 için galeri izni olarak depolama izinlerini ister', () => {
    const kt = lib('src/main/java/expo/modules/imagepicker/ImagePickerModule.kt');
    const fn = kt.slice(kt.indexOf('fun getMediaLibraryPermissions'));
    expect(fn).toContain('SDK_INT >= Build.VERSION_CODES.TIRAMISU');
    expect(fn).toContain('Manifest.permission.WRITE_EXTERNAL_STORAGE');
    expect(fn).toContain('Manifest.permission.READ_EXTERNAL_STORAGE');
  });

  it('kütüphane manifesti depolama izinlerini sınırsız bildirir (daraltma bizde)', () => {
    const xml = lib('src/main/AndroidManifest.xml');
    for (const p of STORAGE) {
      expect(xml).toMatch(new RegExp(`<uses-permission android:name="${p}" />`));
    }
  });
});

describe('app.json — Android izinleri', () => {
  it('depolama izinleri blockedPermissions içinde DEĞİL (Android 7-12 picker kırılır)', () => {
    const blocked = expo.android.blockedPermissions ?? [];
    for (const p of STORAGE) expect(blocked).not.toContain(p);
  });

  it('depolama izinleri düz permissions listesinde de yok (sınırsız bildirim olur)', () => {
    for (const p of STORAGE) expect(expo.android.permissions ?? []).not.toContain(p);
  });

  it('withLegacyStoragePermissions plugin\'i kayıtlı', () => {
    expect(expo.plugins).toContain('./plugins/withLegacyStoragePermissions.js');
    expect(fs.existsSync(path.join(ROOT, 'plugins/withLegacyStoragePermissions.js'))).toBe(true);
  });

  it('POST_NOTIFICATIONS kalır', () => {
    expect(expo.android.permissions).toContain('android.permission.POST_NOTIFICATIONS');
  });
});

describe('withLegacyStoragePermissions — manifest dönüşümü', () => {
  const run = (uses?: Perm[]) =>
    plugin.applyLegacyStoragePermissions({
      manifest: { $: {}, ...(uses ? { 'uses-permission': uses } : {}) },
    });

  it('iki depolama izni maxSdkVersion=32 + tools:node=replace ile eklenir', () => {
    const out = run().manifest['uses-permission']!;
    for (const name of STORAGE) {
      const entry = out.find((e) => e.$['android:name'] === name);
      expect(entry?.$).toEqual({
        'android:name': name,
        'android:maxSdkVersion': '32',
        'tools:node': 'replace',
      });
    }
  });

  it('tools ad alanını bildirir (aksi halde tools:node birleşmede patlar)', () => {
    expect(run().manifest.$?.['xmlns:tools']).toBe('http://schemas.android.com/tools');
  });

  it('mevcut izinlere dokunmaz, tekrar çalıştırılınca çoğalmaz', () => {
    const existing = { $: { 'android:name': 'android.permission.INTERNET' } };
    const once = run([existing]);
    const twice = plugin.applyLegacyStoragePermissions(once);
    const names = twice.manifest['uses-permission']!.map((e) => e.$['android:name']);
    expect(names.filter((n) => n === 'android.permission.INTERNET')).toHaveLength(1);
    for (const p of STORAGE) expect(names.filter((n) => n === p)).toHaveLength(1);
  });

  it('daha önce konmuş sınırsız/remove girdisini ezer', () => {
    const out = run([
      { $: { 'android:name': STORAGE[0]!, 'tools:node': 'remove' } },
      { $: { 'android:name': STORAGE[1]! } },
    ]).manifest['uses-permission']!;
    expect(out.filter((e) => STORAGE.includes(e.$['android:name']!))).toHaveLength(2);
    expect(out.every((e) => e.$['tools:node'] !== 'remove')).toBe(true);
    expect(out.every((e) => e.$['android:maxSdkVersion'] === '32')).toBe(true);
  });
});

/**
 * CAMERA / RECORD_AUDIO'nun tek kaynağı expo-image-picker plugin'i:
 * `cameraPermission:false` + `microphonePermission:false` onları kendisi
 * `tools:node="remove"` ile bloklar. `blockedPermissions`'a ikinci kez yazmak
 * iki yerde bakım demekti. (Gerçek prebuild çıktısında ikisi de
 * `tools:node="remove"` olarak doğrulandı.)
 */
describe('CAMERA / RECORD_AUDIO — tek kaynak image-picker plugin\'i', () => {
  const pickerOptions = () => {
    const entry = expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-image-picker');
    return (entry as [string, Record<string, unknown>]).at(1) as Record<string, unknown>;
  };

  it('plugin kamera ve mikrofonu kapatır', () => {
    expect(pickerOptions().cameraPermission).toBe(false);
    expect(pickerOptions().microphonePermission).toBe(false);
  });

  it('app.json\'da android.blockedPermissions yok (çift engelleme kalktı)', () => {
    expect(expo.android.blockedPermissions).toBeUndefined();
  });

  it('plugin kaynağı bu iki izni false opsiyonunda bloklar', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'node_modules/expo-image-picker/plugin/build/withImagePicker.js'),
      'utf8',
    );
    expect(src).toContain("microphonePermission === false && 'android.permission.RECORD_AUDIO'");
    expect(src).toContain("cameraPermission === false && 'android.permission.CAMERA'");
    expect(src).toContain('withBlockedPermissions');
  });

  it('CAMERA / RECORD_AUDIO düz permissions listesinde de yok', () => {
    const perms = expo.android.permissions ?? [];
    expect(perms).not.toContain('android.permission.CAMERA');
    expect(perms).not.toContain('android.permission.RECORD_AUDIO');
  });
});
