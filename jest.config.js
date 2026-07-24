/**
 * Mobil komponent/birim testleri — jest-expo + React Native Testing Library.
 * Detay: docs/superpowers/specs/mobile-test-strategy.md
 */
const path = require('path');

// React'i (nerede hoist edildiyse) tek kopyaya kilitle — standalone repoda tek
// React sürümü hoisted köke çözülür. Sabit `node_modules/react` yolu yerine
// require.resolve ile bul (metro.config.js'deki resolver düzeltmesinin Jest karşılığı).
const resolveDir = (name) => {
  try {
    return path.dirname(
      require.resolve(`${name}/package.json`, { paths: [__dirname] }),
    );
  } catch {
    return null;
  }
};
const reactDir = resolveDir('react');
const reactDomDir = resolveDir('react-dom');

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // pnpm: gerçek paket dosyaları node_modules/.pnpm/<pkg>@ver/node_modules/<pkg> altında.
  // .pnpm segmentinden sonra istisna-dışı paketleri ignore et (transform etme); RN/expo/
  // workspace paketlerini istisna tut. (Tek, backtrack'siz pattern.)
  transformIgnorePatterns: [
    'node_modules/\\.pnpm/(?!(react-native|@react-native|expo|@expo|react-navigation|@react-navigation|@react-native-async-storage|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|@unimodules|unimodules|sentry-expo|@sentry|native-base|@expo-google-fonts|@tanstack))',
  ],
  // Salt komponent/birim testleri (Maestro/detox hariç).
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    // jest-expo preset'inin kendi mapping'lerini olduğu gibi devral (spread).
    ...(require('jest-expo/jest-preset').moduleNameMapper ?? {}),
    // Path alias `@/*` → `src/*` (tsconfig.json ile tek kaynak). Folded internal
    // libraries (@/ui, @/theme, @/types, @/lib/*, @/i18n/lib) hepsi bunun altında.
    '^@/(.*)$': '<rootDir>/src/$1',
    // React tekil örnek zorlaması — nested kopya kalırsa dispatcher uyumsuzluğunu önler.
    ...(reactDir
      ? { '^react$': reactDir, '^react/(.*)$': `${reactDir}/$1` }
      : {}),
    ...(reactDomDir
      ? { '^react-dom$': reactDomDir, '^react-dom/(.*)$': `${reactDomDir}/$1` }
      : {}),
  },
};
