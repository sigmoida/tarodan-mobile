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
#   release.sh build-state  <ios|android> <profile[,profile...]> <runtime-version> [channel]
#       Bu runtime için binary durumu, tek satır:
#         available <id>  bitmiş VE (store profiliyse) gönderimi başarılı build
#         pending <id>    kuyrukta / derleniyor / bitti ama gönderimi sürüyor
#         none            yukarıdakilerin hiçbiri (hata, iptal, gönderimi
#                         başarısız ya da hiç gönderilmemiş build sayılmaz)
#   release.sh last-store-version <ios|android> <build-profile>
#       O profilin son BİTMİŞ build'inin appVersion'ı (yoksa boş).
#   release.sh version-gt   <a> <b>
#       a > b (semver, sort -V) ise 0, değilse 1 ile çıkar.
#   release.sh publish-ota  <eas-branch> <ios|android|all> <build-profile> <message>
#       Profil env'ini yükleyip `eas update` yayınlar.
#   release.sh plan         <staging|production>
#       Platform başına karar (fingerprint → OTA / build / skip). Girdiler env'den:
#       MODE (auto|ota|build|apk), PLATFORM (all|ios|android), ANDROID_ENABLED,
#       COMMIT_MSG, SHA. Çıktılar GITHUB_OUTPUT'a: message, <p>
#       (ota|build|wait|skip|blocked), <p>_fp, ota_platform, blocked (engellenen
#       platformlar), decided=true (EN SON yazılır: yalnız tüm kararlar
#       tamamlandıysa; downstream job'lar buna bakar) + staging'de apk.
#       `blocked` bir platformu durdurur, diğerini DEĞİL; workflow plan job'unu
#       sonda kırmızıya çevirir. Workflow'lardaki tek karar döngüsü budur.
#   release.sh recheck      <ios|android> <staging|production>
#       Build job'ı kilidi aldıktan sonra (FP, MODE env'den) yeniden sorgular;
#       GITHUB_OUTPUT'a action=build|ota|skip yazar. staging: arada build
#       başladıysa ota; production: onaysız OTA'ya düşmez, skip + uyarı.
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
# Bash < 4.4'te `x="$(...)"` içindeki alt kabuk set -e'yi DÜŞÜRÜR; hata ortada
# kalır. CI (ubuntu, bash 5) bunu açar; macOS'un bash 3.2'sinde yok (yerel test).
shopt -s inherit_errexit 2>/dev/null || true

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

# OTA'nın bundle'a gömdüğü ve yayın öncesi BOŞ OLAMAYACAK değişkenler.
REQUIRED_PUBLIC_ENV="EXPO_PUBLIC_ENVIRONMENT EXPO_PUBLIC_API_URL EXPO_PUBLIC_WEB_URL"

# Profil env'ini bu kabuğa export eder. Process substitution (`< <(...)`)
# KULLANILMAZ: içindeki hata set -e'ye ulaşmaz ve döngü boş env ile sessizce
# devam ederdi (→ API adresi boş bir OTA). Önce çıktı alınır, hata varsa durulur.
# Runner'dan sızmış eski değerler önce temizlenir: doğrulama yalnız eas.json'dan
# gelen değerleri görsün.
load_profile_env() {
  local profile="$1" lines line key
  lines="$(profile_env "$profile")" || die "eas.json build.$profile env'i okunamadı"
  for key in $REQUIRED_PUBLIC_ENV; do unset "$key"; done
  while IFS= read -r line; do
    if [ -n "$line" ]; then export "${line?}"; fi
  done <<< "$lines"
}

# Yüklenen env'i doğrular. <branch> verilirse (OTA) ortama özgü kurallar da
# uygulanır; production OTA'sı ASLA staging/yerel bir API'ye bakmaz.
require_public_env() {
  local profile="$1" branch="${2:-}" key channel
  for key in $REQUIRED_PUBLIC_ENV; do
    [ -n "${!key:-}" ] || die "eas.json build.$profile.env.$key boş/eksik — yayın durduruldu."
  done
  case "$EXPO_PUBLIC_API_URL" in
    https://*) ;;
    *) die "EXPO_PUBLIC_API_URL https:// ile başlamalı ($profile: '$EXPO_PUBLIC_API_URL')." ;;
  esac
  [ -n "$branch" ] || return 0
  channel="$(node -e 'const p=require(process.argv[1]).build[process.argv[2]];console.log((p&&p.channel)||"")' "$ROOT/eas.json" "$profile")"
  [ "$channel" = "$branch" ] \
    || die "OTA dalı '$branch' ama build.$profile.channel '$channel' — yanlış profil env'iyle yayın yapılmaz."
  case "$branch" in
    production)
      [ "$EXPO_PUBLIC_ENVIRONMENT" = production ] \
        || die "production OTA'sı EXPO_PUBLIC_ENVIRONMENT=production ister ('$EXPO_PUBLIC_ENVIRONMENT')."
      case "$EXPO_PUBLIC_API_URL $EXPO_PUBLIC_WEB_URL" in
        *staging*|*localhost*|*127.0.0.1*)
          die "production OTA'sı staging/yerel adrese bakıyor ($EXPO_PUBLIC_API_URL) — durduruldu." ;;
      esac ;;
    staging)
      [ "$EXPO_PUBLIC_ENVIRONMENT" = preview ] \
        || die "staging OTA'sı EXPO_PUBLIC_ENVIRONMENT=preview ister ('$EXPO_PUBLIC_ENVIRONMENT')." ;;
  esac
}

fingerprint() {
  local profile="$1" platform="$2"
  (
    load_profile_env "$profile"
    require_public_env "$profile"
    cd "$ROOT"
    npx expo-updates fingerprint:generate --platform "$platform" \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const h=JSON.parse(s).hash;if(!h)process.exit(1);console.log(h)})'
  )
}

# EAS verisi (eas-cli 24.x, `--help` ve kaynak ile doğrulandı):
#   eas build:list --json  → GraphQL BuildFragment dizisi: id, status
#     (NEW|IN_QUEUE|IN_PROGRESS|PENDING_CANCEL|FINISHED|ERRORED|CANCELED),
#     buildProfile, distribution, runtime.version (eski sürümlerde
#     runtimeVersion), appVersion, appIdentifier, message, createdAt.
#     Build'in gönderimleri bu çıktıda YOK.
#   eas submit:list --json → SubmissionWithSubmittedBuildFragment dizisi: status
#     (AWAITING_BUILD|IN_QUEUE|IN_PROGRESS|FINISHED|ERRORED|CANCELED),
#     submittedBuild.id. Profil filtresi yok; son 50 gönderim okunur.
# "Binary mevcut" yalnız `available`dır. Belirsiz her şey (tanınmayan JSON,
# gönderimi görünmeyen build) mevcut SAYILMAZ: OTA yerine build/bekle kararı
# çıkar; en kötü ihtimalle fazladan bir build harcanır (kota koruması plan'da),
# asla binary'si olmayan bir runtime'a "binary var" denmez.
build_state() {
  local platform="$1" profiles="$2" runtime="$3" channel="${4:-}"
  local profile tmp state
  local -a list
  tmp="$(mktemp -d)"
  IFS=, read -r -a list <<< "$profiles"
  for profile in "${list[@]}"; do
    local args=(build:list --platform "$platform" --build-profile "$profile"
      --runtime-version "$runtime" --limit 50 --json --non-interactive)
    if [ -n "$channel" ]; then args+=(--channel "$channel"); fi
    eas "${args[@]}" > "$tmp/builds-$profile.json" \
      || die "eas build:list başarısız ($platform/$profile)"
  done
  state="$(classify_builds "$tmp" "$runtime")"
  if [ "$state" = need-submissions ]; then
    eas submit:list --platform "$platform" --limit 50 --json --non-interactive > "$tmp/submissions.json" \
      || die "eas submit:list başarısız ($platform)"
    state="$(classify_builds "$tmp" "$runtime")"
  fi
  rm -rf "$tmp"
  echo "$state"
}

classify_builds() {
  node -e '
    const fs = require("fs"), path = require("path");
    const [dir, runtime, easJsonPath] = process.argv.slice(1);
    const eas = require(easJsonPath);
    const norm = (s) => String(s || "").toLowerCase().replace(/-/g, "_");
    const builds = [];
    for (const f of fs.readdirSync(dir).filter((f) => f.startsWith("builds-"))) {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      builds.push(...JSON.parse(raw || "[]"));
    }
    const rt = (b) => (b.runtime && b.runtime.version) || b.runtimeVersion;
    if (builds.length && !builds.some((b) => rt(b))) {
      console.error("::warning::eas build:list JSON şekli tanınmadı (runtime.version/runtimeVersion yok) — hiçbir build mevcut sayılmadı. eas-cli sürümünü kontrol et.");
    }
    const ours = builds.filter((b) => rt(b) === runtime);
    const needsSubmit = (b) => {
      const p = eas.build && eas.build[b.buildProfile];
      return p ? p.distribution === "store" : norm(b.distribution) !== "internal";
    };
    const subFile = path.join(dir, "submissions.json");
    const subs = fs.existsSync(subFile) ? JSON.parse(fs.readFileSync(subFile, "utf8") || "[]") : null;
    const subStatuses = (id) =>
      (subs || []).filter((s) => s.submittedBuild && s.submittedBuild.id === id).map((s) => norm(s.status));
    const running = new Set(["new", "in_queue", "in_progress"]);
    const subRunning = new Set(["awaiting_build", "in_queue", "in_progress"]);
    const decide = () => {
      let pending = null;
      for (const b of ours) {
        const st = norm(b.status);
        if (running.has(st)) { pending = pending || b.id; continue; }
        if (st !== "finished") continue;
        if (!needsSubmit(b)) return "available " + b.id;
        if (subs === null) return "need-submissions";
        const ss = subStatuses(b.id);
        if (ss.includes("finished")) return "available " + b.id;
        if (ss.some((x) => subRunning.has(x))) pending = pending || b.id;
      }
      return pending ? "pending " + pending : "none";
    };
    console.log(decide());
  ' "$1" "$2" "$ROOT/eas.json"
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
    require_public_env "$profile" "$branch"
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

output() { printf '%s\n' "$@" >> "${GITHUB_OUTPUT:-/dev/stdout}"; }
summary() { printf '%s\n' "$@" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }

# Ortam → EAS build profili / kanalı / yayın dalı.
env_config() {
  case "$1" in
    staging) BUILD_PROFILE=staging CHANNEL=staging BRANCH=development ;;
    production) BUILD_PROFILE=production CHANNEL=production BRANCH=master ;;
    *) die "bilinmeyen ortam: '$1' (staging|production)" ;;
  esac
}

# "Bu runtime için binary var" sayılan build profilleri:
#   iOS: yalnız ortamın profili. `preview` iOS ad-hoc build'leri de staging
#        kanalında ama testçiler onları kullanmıyor; sayılsaydı TestFlight
#        testçileri yeni binary alamazdı.
#   staging Android, ANDROID_ENABLED kapalıyken: mevcut ad-hoc APK'lar (`preview`)
#        da OTA alabilsin. Açıkken yalnız `staging` (Play internal).
binary_profiles() {
  local env="$1" platform="$2"
  if [ "$env" = staging ] && [ "$platform" = android ] && [ "${ANDROID_ENABLED:-false}" != true ]; then
    echo "$BUILD_PROFILE,preview"
  else
    echo "$BUILD_PROFILE"
  fi
}

plan() {
  local env="$1"
  env_config "$env"
  local mode="${MODE:-auto}" want="${PLATFORM:-all}" android_enabled="${ANDROID_ENABLED:-false}"
  local sha="${SHA:-0000000}" msg version="" p fp state build_id decision last text
  local ota="" blocked=""
  msg="$(printf '%s' "${COMMIT_MSG:-manual $env ($mode) ${sha:0:7}}" | head -n1)"
  output "message=$msg"

  if [ "$env" = staging ]; then
    if [ "$mode" = apk ]; then
      output apk=true ios=skip android=skip ota_platform=none blocked= decided=true
      return 0
    fi
    output apk=false
  fi
  [ "$env" = production ] && version="$(node -p "require(process.argv[1]).expo.version" "$ROOT/app.json")"

  for p in ios android; do
    if [ "$want" != all ] && [ "$want" != "$p" ]; then
      output "$p=skip"; continue
    fi
    if [ "$env" = production ] && [ "$p" = android ] && [ "$android_enabled" != true ]; then
      # Production'da hiç Android binary'si yok; OTA da build de anlamsız.
      echo "::notice::android: vars.ANDROID_RELEASE_ENABLED != 'true' — atlandı."
      output "android=skip"; continue
    fi
    fp="$(fingerprint "$BUILD_PROFILE" "$p")"
    output "${p}_fp=$fp"
    state="$(build_state "$p" "$(binary_profiles "$env" "$p")" "$fp" "$CHANNEL")"
    build_id="${state#* }"
    [ "$build_id" != "$state" ] || build_id=""
    echo "$p: fingerprint=$fp binary=${state}"

    case "$mode:${state%% *}" in
      ota:*) decision=ota ;;
      build:*) decision=build ;;
      *:available) decision=ota ;;
      *:pending)
        # Binary henüz YOK (derleniyor ya da gönderimi sürüyor): OTA ona
        # ulaşacak mı belirsiz → yayınlanmaz; ikinci bir build de alınmaz.
        decision="wait"
        echo "::warning::$p: bu runtime ($fp) için build/gönderim sürüyor ($build_id) — OTA yayınlanmadı, ikinci build alınmadı. Bitince JS farkı için: gh workflow run mobile-$env.yml --ref $BRANCH -f mode=ota -f platform=$p" ;;
      *) decision=build ;;
    esac
    if [ "$decision" = ota ] && [ "${state%% *}" != available ]; then
      echo "::warning::$p: bu runtime ($fp) için gönderilmiş bir $env binary'si yok ($state) — OTA elle istendi, hiçbir binary'ye ULAŞMAYABİLİR."
    fi
    if [ "$decision" = build ] && [ "$env" = staging ] && [ "$p" = android ] && [ "$android_enabled" != true ]; then
      echo "::notice::android: native değişti ama vars.ANDROID_RELEASE_ENABLED != 'true' — Android build atlandı. Ad-hoc APK için: gh workflow run mobile-staging.yml --ref development -f mode=apk"
      decision=skip
    fi

    # VERSION-GATE (production): yeni bir store binary'si yeni bir sürüm ister.
    # Karşılaştırma son BİTMİŞ production build'inin appVersion'ıyla yapılır
    # (push tabanıyla değil): iptal edilmiş bir önceki koşu ya da çok commit'li
    # bir merge kapıyı yanıltamaz. Kapı PLATFORM BAŞINADIR: iOS'un kapısı
    # takılırsa Android'in OTA'sı yine çıkar (ve tersi); koşu sonda kırmızı olur.
    if [ "$decision" = build ] && [ "$env" = production ]; then
      last="$(last_store_version "$p" "$BUILD_PROFILE")"
      if [ -n "$last" ] && ! version_gt "$version" "$last"; then
        text="$p: native değişti (fingerprint $fp için production build'i yok) ama app.json expo.version ($version) son production build'inin sürümünden ($last) büyük değil. Bu merge'de expo.version'ı artır (ör. development'ta app.json'u güncelleyip yeni bir PR aç)."
        if [ "$mode" = build ]; then
          echo "::warning::$text — mode=build ile elle istendi, devam ediliyor."
        else
          echo "::error::$text"
          decision=blocked
        fi
      fi
      [ "$decision" = blocked ] || echo "$p: sürüm ${last:-<ilk build>} → $version"
    fi

    output "$p=$decision"
    case "$decision" in
      ota) ota="$ota $p" ;;
      blocked) blocked="$blocked $p" ;;
    esac
    summary "### $p → \`$decision\`" "- fingerprint: \`$fp\`" "- binary: $state"
    [ -n "$version" ] && summary "- app.json expo.version: \`$version\`"
  done

  case "$ota" in
    "") output ota_platform=none ;;
    " ios android") output ota_platform=all ;;
    *) output "ota_platform=${ota# }" ;;
  esac
  output "blocked=${blocked# }"
  output decided=true
}

recheck() {
  local platform="$1" env="$2" state=none action=build
  env_config "$env"
  [ -n "${FP:-}" ] || die "recheck: FP (plan'ın fingerprint'i) boş"
  if [ "${MODE:-auto}" != build ]; then
    state="$(build_state "$platform" "$BUILD_PROFILE" "$FP" "$CHANNEL")"
  fi
  case "$env:${state%% *}" in
    staging:available)
      action=ota
      echo "::notice::Bu runtime için arada gönderilmiş bir binary oluştu (${state#* }) — build yerine OTA." ;;
    staging:pending)
      action=skip
      echo "::warning::Bu runtime için arada bir build/gönderim başlamış (${state#* }) — ikinci build alınmadı, OTA da yayınlanmadı (binary henüz yok)." ;;
    production:available|production:pending)
      # Production OTA onay ister; burada sessizce OTA'ya dönülmez.
      action=skip
      echo "::warning::Bu runtime için arada bir production build'i oluştu ($state) — ikinci build alınmadı. JS farkı varsa: gh workflow run mobile-production.yml --ref master -f mode=ota -f platform=$platform" ;;
  esac
  output "action=$action"
}

cmd="${1:-}"
shift || true
case "$cmd" in
  profile-env) profile_env "$@" ;;
  fingerprint) fingerprint "$@" ;;
  build-state) build_state "$@" ;;
  last-store-version) last_store_version "$@" ;;
  version-gt) version_gt "$@" ;;
  publish-ota) publish_ota "$@" ;;
  plan) plan "$@" ;;
  recheck) recheck "$@" ;;
  build-submit) build_submit "$@" ;;
  *) die "bilinmeyen komut: '$cmd' (bkz. dosya başı)" ;;
esac
