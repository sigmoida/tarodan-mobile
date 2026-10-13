/**
 * docs/EAS_UPDATE_OTA.md fingerprint anlatımı ölçülen davranışla uyumlu kalsın.
 *
 * Ölçüm (expo-updates fingerprint:generate, @expo/fingerprint 0.15.5):
 *  - hash yalnız çözümlenen Expo config'ine bağlı DEĞİL: eas.json'un tamamı ve
 *    expo.version de hash'e girer;
 *  - app.config.js EXPO_PUBLIC_ENVIRONMENT'a göre farklı config çözer, bu yüzden
 *    staging parmak izi `EXPO_PUBLIC_ENVIRONMENT=preview` ile üretilmelidir.
 */
import * as fs from 'fs';
import * as path from 'path';

const doc = fs.readFileSync(path.resolve(__dirname, '../../../docs/EAS_UPDATE_OTA.md'), 'utf8');

describe('docs/EAS_UPDATE_OTA.md — fingerprint', () => {
  it('staging için ortam değişkenli komutu yazar', () => {
    expect(doc).toContain('EXPO_PUBLIC_ENVIRONMENT=preview npx expo-updates fingerprint:generate');
  });

  it('eas.json düzenlemesinin parmak izini değiştirdiğini söyler', () => {
    expect(doc).toMatch(/eas\.json[^\n]*(any edit|whole file)/i);
  });

  it('"yalnız çözümlenen config değişince değişir" demez', () => {
    expect(doc).toContain('does **not** change only when the resolved Expo config');
  });

  it('sürüm artışının runtime\'ı değiştirmediği yanlış iddiası geri gelmesin', () => {
    expect(doc).not.toMatch(/bumping `expo\.version` alone does not change/i);
    expect(doc).not.toMatch(/keeps the same fingerprint across versions/i);
  });

  it('app.config.js\'in okuduğu dosyalar native sayılır', () => {
    expect(doc).toContain('src/lib/deeplinks/paths.json');
  });
});
