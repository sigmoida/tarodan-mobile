const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

/**
 * expo-image-picker@17 Android 12 ve altında (API < 33) galeri iznini
 * `requestMediaLibraryPermissionsAsync` ile ister ve istediği izinler tam
 * olarak WRITE_EXTERNAL_STORAGE + READ_EXTERNAL_STORAGE'dır
 * (ImagePickerModule.kt `getMediaLibraryPermissions`). Bu iki izin manifestte
 * YOKSA Android isteği sessizce reddeder; ilan fotoğrafı, mesaj görseli ve
 * iade kanıtı eklenemez.
 *
 * `android.blockedPermissions` bu izinleri tümden siler. Bunun yerine kütüphane
 * manifestindeki (sınırsız) bildirimi `maxSdkVersion=32` ile DARALTIRIZ:
 *   - API <= 32 (Android 7-12): izin bildirili, picker çalışır.
 *   - API >= 33 (Android 13+): izin hiç bildirilmez (picker isteği zaten
 *     `emptyArray()`; sistem foto seçicisi izin istemez).
 * `tools:node="replace"` birleşmede kütüphanenin bildirimini bu satırla ezer.
 */
const MAX_SDK = '32';
const PERMISSIONS = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

/** Saf manifest dönüşümü (birim testlenir). */
function applyLegacyStoragePermissions(androidManifest) {
  const manifest = AndroidConfig.Manifest.ensureToolsAvailable(androidManifest);
  const current = Array.isArray(manifest.manifest['uses-permission'])
    ? manifest.manifest['uses-permission']
    : [];
  manifest.manifest['uses-permission'] = [
    ...current.filter((entry) => !PERMISSIONS.includes(entry.$?.['android:name'])),
    ...PERMISSIONS.map((name) => ({
      $: {
        'android:name': name,
        'android:maxSdkVersion': MAX_SDK,
        'tools:node': 'replace',
      },
    })),
  ];
  return manifest;
}

module.exports = function withLegacyStoragePermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    cfg.modResults = applyLegacyStoragePermissions(cfg.modResults);
    return cfg;
  });
};
module.exports.applyLegacyStoragePermissions = applyLegacyStoragePermissions;
module.exports.PERMISSIONS = PERMISSIONS;
module.exports.MAX_SDK = MAX_SDK;
