const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = "pod 'GoogleUtilities', :modular_headers => true";
const BLOCK = [
  '',
  '  # Google Sign-In bağımlılıkları (AppCheckCore) static library olarak entegre',
  '  # olabilmek için modular headers ister; aksi halde pod install patlar.',
  "  pod 'GoogleUtilities', :modular_headers => true",
  "  pod 'RecaptchaInterop', :modular_headers => true",
  '',
].join('\n');

/**
 * google-signin native pod'larının static lib olarak kurulabilmesi için
 * Podfile'a modular_headers ekler. Eski elle-yamalı Podfile'ı app.json'dan
 * üretilebilir hale getirir (prebuild --clean sonrası korunur).
 */
module.exports = function withGoogleSigninPods(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes(MARKER)) {
        // Target adı varyanta göre değişir (prod: `Tarodan`, staging:
        // `TarodanStaging`). Bu yüzden sabit isim yerine herhangi bir target
        // adını yakala — aksi halde staging build'de block enjekte edilmez ve
        // pod install `AppCheckCore` modular_headers hatasıyla patlar.
        contents = contents.replace(
          /(target '[^']+' do\n\s*use_expo_modules!\n)/,
          `$1${BLOCK}`,
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
