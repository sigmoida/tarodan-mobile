#!/usr/bin/env bash
# Yolculuk 1 — uçtan uca orkestrasyon (görünür simülatörde).
# UI segmentleri Maestro ile, UI dışı geçişler journey-driver ile.
#
# Kullanım: bash maestro/journeys/run-journey-1.sh
set -euo pipefail

MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_DIR="$(cd "$MOBILE_DIR/../api" && pwd)"
MAESTRO_DIR="$MOBILE_DIR/maestro"

# Benzersiz e-posta — saniye damgalı (Date.now scriptte yasak değil, bash'te serbest).
STAMP="$(date +%s)"
# Kullanıcı adı da koşum başına benzersiz olmalı (bir kez belirlenir, değiştirilemez).
# ⚠️ Regex `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$` — TİRE ve İKİ NOKTA GEÇERSİZ, yani
# e-postadaki "maestro-j1-" deseni kullanılamaz. Damgayı rakamlara indirgeyip
# yalnız [a-z0-9] üretiyoruz; sonuç ~19 karakter (3-30 sınırının içinde).
STAMP_ALNUM="$(printf '%s' "$STAMP" | tr -cd '0-9')"
REG_EMAIL="maestro-j1-${STAMP}@demo.com"
REG_USERNAME="maestroj1${STAMP_ALNUM}"
REG_PASSWORD="Demo123!"
REG_NAME="Maestro Alıcı ${STAMP}"

step() { printf '\n\033[1;35m=== %s ===\033[0m\n' "$1"; }
driver() { ( cd "$API_DIR" && node scripts/journey-driver.js "$@" --email "$REG_EMAIL" ); }
ui() {
  ( cd "$MOBILE_DIR" && \
    EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN=1 \
    bash maestro/run.sh "flows/$1" \
      --env REG_EMAIL="$REG_EMAIL" \
      --env REG_USERNAME="$REG_USERNAME" \
      --env REG_PASSWORD="$REG_PASSWORD" \
      --env REG_NAME="$REG_NAME" )
}

step "Yolculuk 1 başlıyor — alıcı: $REG_EMAIL (@$REG_USERNAME)"

step "Segment A (UI): misafir gez + kayıt — simülatörü izle"
ui "J1-a-register-buy.yaml"

step "Driver: email doğrula + default adres seed et"
driver verify-email
driver seed-address

step "Segment B (UI): giriş + sepet + checkout + ödeme — simülatörü izle"
ui "J1-b-login-buy.yaml"

step "Driver: fatura assert + satıcı kargolama/teslim simülasyonu"
driver assert-invoice
driver advance-to-delivered

step "Segment C (UI): teslim onayı — simülatörü izle"
ui "J1-c-confirm-delivery.yaml"

step "Driver: escrow/hold release zorla (adım 10) + completed assert"
driver release-hold
driver assert-completed

step "✅ Yolculuk 1 tamamlandı — alıcı: $REG_EMAIL"
