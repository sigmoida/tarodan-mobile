/**
 * iOS gizlilik manifesti — toplanan veri türleri (`NSPrivacyCollectedDataTypes`) uygulamanın
 * gerçek toplamasıyla eşleşir; hepsi kullanıcıya bağlı, hiçbiri izleme değil. App Store
 * Connect'teki gizlilik etiketi de BU listeyle aynı olmalı (manuel adım).
 */
import * as fs from 'fs';
import * as path from 'path';

const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../app.json'), 'utf8'));
const manifest = appJson.expo.ios.privacyManifests;
const collected = manifest.NSPrivacyCollectedDataTypes as Array<Record<string, unknown>>;

const EXPECTED = [
  'NSPrivacyCollectedDataTypeName',
  'NSPrivacyCollectedDataTypeEmailAddress',
  'NSPrivacyCollectedDataTypePhoneNumber',
  'NSPrivacyCollectedDataTypePhysicalAddress',
  'NSPrivacyCollectedDataTypePhotosorVideos',
  'NSPrivacyCollectedDataTypeOtherUserContent',
  'NSPrivacyCollectedDataTypePurchaseHistory',
  'NSPrivacyCollectedDataTypeUserID',
  'NSPrivacyCollectedDataTypeDeviceID',
  'NSPrivacyCollectedDataTypeCrashData',
  'NSPrivacyCollectedDataTypePerformanceData',
];

it('beklenen veri türleri birer kez listelenir', () => {
  expect(collected.map((c) => c.NSPrivacyCollectedDataType).sort()).toEqual([...EXPECTED].sort());
});

/**
 * `aps-environment`: cihaz build'lerinin HEPSİ (EAS preview = ad hoc, staging/production =
 * App Store/TestFlight) üretim APNs ortamını kullanır; `development` profili yalnız simülatör
 * (push yok). Varsayılan `development` imzalı entitlement üretim profiliyle çelişirdi.
 */
it('expo-notifications aps-environment = production', () => {
  const entry = (appJson.expo.plugins as Array<string | [string, Record<string, unknown>]>).find(
    (p) => Array.isArray(p) && p[0] === 'expo-notifications',
  ) as [string, Record<string, unknown>];
  expect(entry[1].mode).toBe('production');
});

it('hepsi kullanıcıya bağlı, izleme yok, amaç belirtilmiş', () => {
  expect(manifest.NSPrivacyTracking).toBe(false);
  for (const c of collected) {
    expect(c.NSPrivacyCollectedDataTypeLinked).toBe(true);
    expect(c.NSPrivacyCollectedDataTypeTracking).toBe(false);
    expect((c.NSPrivacyCollectedDataTypePurposes as string[]).length).toBeGreaterThan(0);
  }
});
