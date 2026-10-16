/**
 * Android izin sözleşmesi.
 *
 * Galeri seçimi İZİNSİZ: uygulama `requestMediaLibraryPermissionsAsync` çağırmaz;
 * `launchImageLibraryAsync` Android Photo Picker / belge seçici kullanır ve depolama izni
 * istemez. Eskiden API < 33'te bu çağrı için READ/WRITE_EXTERNAL_STORAGE bildiriliyordu
 * (`withLegacyStoragePermissions`, maxSdk 32); çağrı kalktığı için izinler
 * `blockedPermissions` ile tamamen kaldırılır.
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

const STORAGE = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name.startsWith('.')) return [];
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });

describe('galeri seçimi izinsiz (kaynak doğrulaması)', () => {
  it('launchImageLibraryAsync Android tarafında izin denetimi yapmaz', () => {
    const kt = fs.readFileSync(
      path.join(ROOT, 'node_modules/expo-image-picker/android/src/main/java/expo/modules/imagepicker/ImagePickerModule.kt'),
      'utf8',
    );
    const start = kt.indexOf('AsyncFunction("launchImageLibraryAsync")');
    const body = kt.slice(start, kt.indexOf('AsyncFunction(', start + 10));
    expect(body).not.toMatch(/ermission/);
  });

  it('uygulama kodu requestMediaLibraryPermissionsAsync çağırmaz', () => {
    const offenders = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'src'))]
      .filter((f) => !f.includes(`${path.sep}__tests__${path.sep}`) && !f.includes('test-utils'))
      .filter((f) => fs.readFileSync(f, 'utf8').includes('requestMediaLibraryPermissionsAsync('));
    expect(offenders).toEqual([]);
  });
});

describe('app.json — Android izinleri', () => {
  it('depolama izinleri blockedPermissions ile kaldırılır', () => {
    const blocked = expo.android.blockedPermissions ?? [];
    for (const p of STORAGE) expect(blocked).toContain(p);
  });

  it('depolama izinleri düz permissions listesinde yok', () => {
    for (const p of STORAGE) expect(expo.android.permissions ?? []).not.toContain(p);
  });

  it('eski withLegacyStoragePermissions plugin\'i kaldırıldı', () => {
    expect(expo.plugins).not.toContain('./plugins/withLegacyStoragePermissions.js');
    expect(fs.existsSync(path.join(ROOT, 'plugins/withLegacyStoragePermissions.js'))).toBe(false);
  });

  it('SYSTEM_ALERT_WINDOW ve RECEIVE_BOOT_COMPLETED kaldırılır (overlay yok, zamanlanmış yerel bildirim yok)', () => {
    const blocked = expo.android.blockedPermissions ?? [];
    expect(blocked).toContain('android.permission.SYSTEM_ALERT_WINDOW');
    expect(blocked).toContain('android.permission.RECEIVE_BOOT_COMPLETED');
  });

  it('RECEIVE_BOOT_COMPLETED yalnız zamanlanmış yerel bildirimler içindir — uygulama zamanlamaz', () => {
    const offenders = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'src'))]
      .filter((f) => !f.includes(`${path.sep}__tests__${path.sep}`))
      .filter((f) => fs.readFileSync(f, 'utf8').includes('scheduleNotificationAsync('));
    expect(offenders).toEqual([]);
  });

  it('POST_NOTIFICATIONS kalır', () => {
    expect(expo.android.permissions).toContain('android.permission.POST_NOTIFICATIONS');
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

  it('blockedPermissions CAMERA / RECORD_AUDIO\'yu ikinci kez listelemez', () => {
    const blocked = expo.android.blockedPermissions ?? [];
    expect(blocked).not.toContain('android.permission.CAMERA');
    expect(blocked).not.toContain('android.permission.RECORD_AUDIO');
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
