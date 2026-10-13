/**
 * Tarodan Mobile — single-package ESLint config.
 *
 * Base TypeScript rules + react-hooks, plus UI guard rules:
 *   1. `react-native-paper` doğrudan import'unu yasaklar
 *   2. Hex literal renkleri yasaklar (#fff, #FF8800, vs.)
 *   3. rgb() / rgba() inline string'lerini yasaklar
 *
 * UI tek kaynaktan (`@/ui`) gelmeli, renkler `@/theme` (design tokens) semantic
 * token'larından gelmelidir. Design-token KAYNAK dosyaları (ham hex/rgba burada
 * yaşar) `MIGRATION_OVERRIDES` ile kuraldan muaftır.
 */

/**
 * Renk KAYNAĞI olan dosyalar — ham hex/rgba literal'leri burada tanımlanır,
 * bu yüzden raw-color kuralından muaftır.
 */
const MIGRATION_OVERRIDES = [
  'src/theme/**/*.ts',
  'src/ui/lib/theme.ts',
];

/** Hex (#fff, #FF8800, #ff88aa00) ve rgb()/rgba() literal regex */
const HEX_PATTERN = '/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/';
const RGB_PATTERN = '/^rgba?\\(/';

const BAN_PAPER = {
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: 'react-native-paper',
          message:
            "react-native-paper kaldırıldı. Bunun yerine '@/ui'den component import et. Geçişte sorun olursa .eslintrc.cjs MIGRATION_OVERRIDES'a dosyayı ekle.",
        },
      ],
    },
  ],
};

const BAN_RAW_COLOR = {
  'no-restricted-syntax': [
    'error',
    {
      selector: `Literal[value=${HEX_PATTERN}]`,
      message:
        "Hex literal renk yasak. '@/theme'den semantic token kullan (örn. colors.primary[600], colors.text.heading).",
    },
    {
      selector: `Literal[value=${RGB_PATTERN}]`,
      message:
        "rgb()/rgba() literal yasak. '@/theme'den token kullan veya StyleSheet color helper'ı yaz.",
    },
  ],
};

/**
 * Tasarım disiplini (web hizalaması, 2026-10) — ekran katmanında UYARI. Dalga 2 ekranları
 * temizledikçe bunlar `error`'a çevrilecek. Yerel kurallar `eslint-plugin-tarodan/`
 * klasöründe (çekirdek `no-restricted-syntax` renk yasağı için zaten `error`; aynı kural iki
 * seviyede çalışamadığı için ayrı eklenti).
 */
const DESIGN_SCOPE = ['app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'];
const DESIGN_TEST_FILES = ['**/__tests__/**', '**/*.test.{ts,tsx}'];

const DESIGN_WARNINGS = {
  // StyleSheet'te sayısal fontSize/lineHeight/borderRadius, sabit fontWeight → token.
  'tarodan/no-raw-style-values': 'warn',
  // '₺' → formatPrice ("1.234,50 TL").
  'tarodan/no-lira-symbol': 'warn',
  // Button'da ikon yalnız izinli işlev ikonları için (dalga 3).
  'tarodan/restrict-button-icon': 'warn',
  // Elle üst bar / insets.top / SafeAreaView top / elle geri ikonu → ScreenHeader, PageShell,
  // AppShell, useHeaderTopInset. headerShown: true (native header) yasak.
  'tarodan/no-custom-screen-header': 'warn',
  'tarodan/no-native-header': 'warn',
  // Boş durum: ListEmptyComponent içinde elle View/Text yerine EmptyState.
  'tarodan/empty-state-standard': 'warn',
  // Ham RN Text/TouchableOpacity/Modal → @/ui (Text/RawText, Button/Pressable, Modal).
  '@typescript-eslint/no-restricted-imports': [
    'warn',
    {
      paths: [
        {
          name: 'react-native',
          importNames: ['Text', 'TextInput', 'TouchableOpacity', 'Modal'],
          allowTypeImports: true,
          message:
            "'@/ui' kullan: Text (variant/tone) ya da RawText; TextInput yerine Input / RawTextInput (marka fontu); TouchableOpacity yerine Button/IconButton/Pressable; Modal yerine @/ui Modal.",
        },
      ],
    },
  ],
};

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'tarodan'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  env: {
    node: true,
    browser: true,
    es2022: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/no-empty-interface': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-var-requires': 'warn',
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-console': 'off',
    'prefer-const': 'warn',
    'no-case-declarations': 'warn',
    'no-useless-escape': 'warn',
    'no-constant-condition': 'warn',
    ...BAN_PAPER,
    ...BAN_RAW_COLOR,
  },
  overrides: [
    {
      files: DESIGN_SCOPE,
      excludedFiles: DESIGN_TEST_FILES,
      rules: DESIGN_WARNINGS,
    },
    {
      // Renk kaynağı dosyaları raw-color / paper kurallarından muaf.
      files: MIGRATION_OVERRIDES,
      rules: {
        'no-restricted-imports': 'off',
        'no-restricted-syntax': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    '.next',
    '.turbo',
    'coverage',
    'src/i18n/lib/generated',
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
    '*.config.ts',
  ],
};
