#!/usr/bin/env bash
# Yayın hattının (mobile-staging.yml / mobile-production.yml) ortak yardımcıları.
# Workflow'lar bu dosyayı çağırır; mantık tek yerde durur (DRY), YAML yalnız
# akışı tarif eder.
#
#   release.sh profile-env  <build-profile>
#       eas.json build.<profile>.env'ini KEY=VALUE satırları olarak basar.
#   release.sh fingerprint  <build-profile> <ios|android>
#       Profil env'iyle (ör. EXPO_PUBLIC_ENVIRONMENT=preview) runtime fingerprint'i
#       hesaplar. runtimeVersion politikası `fingerprint` olduğu için bu değer,
#       aynı commit'ten alınacak build'in runtimeVersion'ına eşittir.
#   release.sh find-build   <ios|android> <profile[,profile...]> <runtime-version> [channel]
#       Bu runtime için hata/iptal DIŞI bir EAS build'i varsa id'sini basar
#       (bitmiş YA DA kuyrukta/derleniyor). Yoksa boş çıktı.
#   release.sh last-store-version <ios|android> <build-profile>
#       O profilin son BİTMİŞ build'inin appVersion'ı (yoksa boş).
#   release.sh version-gt   <a> <b>
#       a > b (semver, sort -V) ise 0, değilse 1 ile çıkar.
#   release.sh publish-ota  <eas-branch> <ios|android|all> <build-profile> <message>
#       Profil env'ini yükleyip `eas update` yayınlar.
#   release.sh build-submit <ios|android> <build-profile> <submit-profile|->
#       `eas build --wait` alır, build id'sini çıkarır ve (submit profili `-`
#       değilse) TAM O build'i `eas submit --id` ile gönderir. `--latest`
#       kullanılmaz: paralel bitmiş başka profilin build'ini (ör. staging koşarken
#       biten production build'i) yanlış mağaza kaydına gönderebilirdi.
#       Build JSON'u ./eas-build.json'a yazılır; id GITHUB_OUTPUT'a `build_id`.
#
# Neden profil env'i burada yükleniyor: `eas update` eas.json'daki build
# profilinin `env` bloğunu OKUMAZ; EXPO_PUBLIC_* değerlerini runner ortamından
# bundle'a gömer. Eksik kalırsa (a) app.config.js base config üretir → fingerprint
# build'den farklı olur → OTA hiçbir binary'ye ULAŞMAZ; (b) API adresi boş kalır →
# bundle localhost'a bakar. Değerleri doğrudan eas.json'dan okumak eski "workflow
# env bloğunu eas.json ile elle senkron tut" kuralını kopyasız hale getirir.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

die() {
  echo "::error::$*" >&2
  exit 1
}

profile_env() {
  local profile="$1"
  node -e '
    const eas = require(process.argv[1]);
    const p = eas.build && eas.build[process.argv[2]];
    if (!p) { console.error("eas.json: build." + process.argv[2] + " yok"); process.exit(1); }
    for (const [k, v] of Object.entries(p.env || {})) console.log(k + "=" + v);
  ' "$ROOT/eas.json" "$profile"
}

load_profile_env() {
  local line
  while IFS= read -r line; do
    [ -n "$line" ] && export "${line?}"
  done < <(profile_env "$1")
}

fingerprint() {
  local profile="$1" platform="$2"
  (
    load_profile_env "$profile"
    cd "$ROOT"
    npx expo-updates fingerprint:generate --platform "$platform" \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const h=JSON.parse(s).hash;if(!h)process.exit(1);console.log(h)})'
  )
}

# Hata/iptal dışı her durum "bu runtime için binary var ya da geliyor" demektir.
# Derlenmekte olan bir build'i saymak, ardışık iki push'un aynı runtime için iki
# build harcamasını önler: ikinci push OTA yayınlar, build bitince o OTA'yı çeker.
find_build() {
  local platform="$1" profiles="$2" runtime="$3" channel="${4:-}"
  local profile out found
  local -a list
  IFS=, read -r -a list <<< "$profiles"
  for profile in "${list[@]}"; do
    local args=(build:list --platform "$platform" --build-profile "$profile"
      --runtime-version "$runtime" --limit 20 --json --non-interactive)
    [ -n "$channel" ] && args+=(--channel "$channel")
    out="$(eas "${args[@]}")" || die "eas build:list başarısız ($platform/$profile)"
    found="$(printf '%s' "$out" | node -e '
      let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
        const runtime = process.argv[1];
        const dead = new Set(["errored","canceled","cancelled","pending_cancel","pending-cancel"]);
        const builds = JSON.parse(s || "[]");
        const hit = builds.find(b => b.runtimeVersion === runtime &&
          !dead.has(String(b.status || "").toLowerCase()));
        if (hit) console.log(hit.id);
      });
    ' "$runtime")"
    if [ -n "$found" ]; then
      echo "$found"
      return 0
    fi
  done
}

last_store_version() {
  local platform="$1" profile="$2" out
  out="$(eas build:list --platform "$platform" --build-profile "$profile" \
    --status finished --limit 1 --json --non-interactive)" \
    || die "eas build:list başarısız ($platform/$profile)"
  printf '%s' "$out" | node -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
      const b = JSON.parse(s || "[]")[0]; if (b && b.appVersion) console.log(b.appVersion);
    });'
}

version_gt() {
  [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -n1)" = "$1" ]
}

publish_ota() {
  local branch="$1" platform="$2" profile="$3" message="$4"
  (
    load_profile_env "$profile"
    cd "$ROOT"
    eas update --branch "$branch" --platform "$platform" \
      --message "$message" --non-interactive
  )
}

build_submit() {
  local platform="$1" profile="$2" submit_profile="$3" id
  cd "$ROOT"
  eas build --platform "$platform" --profile "$profile" \
    --non-interactive --wait --json > eas-build.json \
    || die "eas build başarısız ($platform/$profile)"
  id="$(node -e 'const b=require(process.argv[1]);const x=Array.isArray(b)?b[0]:b;if(x&&x.id)console.log(x.id)' "$ROOT/eas-build.json")"
  [ -n "$id" ] || die "eas build --json build id döndürmedi ($platform/$profile)"
  echo "build id: $id"
  [ -n "${GITHUB_OUTPUT:-}" ] && echo "build_id=$id" >> "$GITHUB_OUTPUT"
  if [ "$submit_profile" != "-" ]; then
    eas submit --platform "$platform" --profile "$submit_profile" --id "$id" \
      --non-interactive || die "eas submit başarısız ($platform/$submit_profile, build $id)"
  fi
}

cmd="${1:-}"
shift || true
case "$cmd" in
  profile-env) profile_env "$@" ;;
  fingerprint) fingerprint "$@" ;;
  find-build) find_build "$@" ;;
  last-store-version) last_store_version "$@" ;;
  version-gt) version_gt "$@" ;;
  publish-ota) publish_ota "$@" ;;
  build-submit) build_submit "$@" ;;
  *) die "bilinmeyen komut: '$cmd' (bkz. dosya başı)" ;;
esac
