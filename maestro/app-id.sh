#!/usr/bin/env bash
# Maestro akışlarının hedef uygulama kimliği (flow'lardaki `appId: ${APP_ID}`).
#
# Kullanım:   app-id.sh [platform] [hedef]        → stdout'a tek satır paket/bundle id
#   platform: ios | android            (varsayılan: ios — run.sh simülatör koşar)
#   hedef:    dev | staging            (varsayılan: dev)
#     dev      Yerel dev-client / `pnpm ios` build'i                   → com.tarodan.app
#     staging  EAS `maestro` profili build'i (preview'dan türer)
#                ios     → com.tarodan.app.staging   (app.config.js yalnız iOS'a `.staging` ekler)
#                android → com.tarodan.app           (Android paketi staging'de de aynıdır)
# `APP_ID` ortam değişkeni verilmişse HER ŞEYİ ezer (özel build'ler için).
#
# Kaynak: app.json `ios.bundleIdentifier` / `android.package` ve app.config.js
# (src/config/__tests__/maestroAppId.test.ts bu tabloyu o dosyalarla eşler).
set -euo pipefail

PLATFORM="${1:-ios}"
TARGET="${2:-dev}"
PROD_ID="com.tarodan.app"

if [ -n "${APP_ID:-}" ]; then
  printf '%s\n' "$APP_ID"
  exit 0
fi

case "$PLATFORM:$TARGET" in
  ios:dev|android:dev|android:staging) printf '%s\n' "$PROD_ID" ;;
  ios:staging) printf '%s\n' "$PROD_ID.staging" ;;
  *)
    echo "app-id.sh: bilinmeyen platform/hedef: $PLATFORM/$TARGET (ios|android, dev|staging)" >&2
    exit 2
    ;;
esac
