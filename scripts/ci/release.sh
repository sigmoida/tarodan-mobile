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
#   release.sh app-version  [app.json]
#       expo.version'ı basar (göreli/mutlak yol; require() kullanmaz).
#   release.sh latest-release [below]
#       The highest released version: the highest mobile-vX.Y.Z tag in the repo
#       (pre-release tags such as mobile-v1.2.0-rc.1 are ignored). With <below>,
#       only versions lower than it count. Prints nothing if there is none.
#   release.sh next-version [ref]
#       The version of the next release, from the Conventional Commits in
#       `git log --no-merges mobile-v<latest>..<ref>` (default ref: HEAD): a `!`
#       after the type/scope or a BREAKING CHANGE / BREAKING-CHANGE footer ->
#       major, any feat -> minor, anything else -> patch; chore(release) commits
#       are ignored. Prints X.Y.Z on stdout (the reasoning on stderr). If app.json
#       at <ref> already holds a higher version, that one wins (manual override)
#       with a notice. No tag, a shallow clone or nothing to release -> fails.
#   release.sh set-version <X.Y.Z> [app.json]
#       Sets expo.version (only that line changes; never lowers it). Used for
#       the release PR's `chore(release): X.Y.Z` commit.
#   release.sh publish-ota  <eas-branch> <ios|android|all> <build-profile> <message>
#       Profil env'ini yükleyip `eas update` yayınlar.
#   release.sh plan         <staging|production>
#       Platform başına karar (fingerprint → OTA / build / skip). Girdiler env'den:
#       MODE (auto|ota|build|apk), PLATFORM (all|ios|android), ANDROID_ENABLED,
#       COMMIT_MSG, SHA, SOURCE_REF (production: master'a merge edilen PR'ın dalı).
#       Çıktılar GITHUB_OUTPUT'a: message, <p>
#       (ota|build|wait|skip|blocked), <p>_fp, ota_matrix (OTA job'unun matrix'i:
#       [{platform, fp}] — concurrency platform+runtime başına), blocked (engellenen
#       platformlar), decided=true (EN SON yazılır: yalnız tüm kararlar
#       tamamlandıysa; downstream job'lar buna bakar) + staging'de apk.
#       `blocked` bir platformu durdurur, diğerini DEĞİL; workflow plan job'unu
#       sonda kırmızıya çevirir. Workflow'lardaki tek karar döngüsü budur.
#       production + mode=auto iki türlüdür (SOURCE_REF'e göre):
#         sürüm  (development ya da bilinmeyen kaynak): HER ZAMAN store build'i;
#                expo.version son production build'inden büyük değilse blocked.
#                Production OTA'sı bu yoldan ASLA çıkmaz.
#         hotfix (hotfix/*): fingerprint kararı — JS ise onaylı OTA, native ise
#                build (VERSION-GATE'e tabi).
#   release.sh recheck      <ios|android> <staging|production>
#       Build job'ı kilidi aldıktan sonra (FP, MODE env'den) yeniden sorgular;
#       GITHUB_OUTPUT'a action=build|ota|skip ve await=true|false yazar. staging:
#       arada build başladıysa ota (await=true) ya da bittiyse ota; production:
#       onaysız OTA'ya düşmez, skip + uyarı.
#   release.sh await-binary <ios|android> <staging|production> <runtime-version>
#       Bu runtime'ın derlenen build'i kalmayana kadar bekler (gönderim beklenmez;
#       AWAIT_MINUTES, varsayılan 75; AWAIT_INTERVAL sn, varsayılan 60; ANDROID_ENABLED
#       plan'daki gibi). Staging OTA'sı derlenen build'den SONRA yayınlansın diye
#       (ota_matrix'te "await":true, recheck'te await=true).
#   release.sh guard-ref    <staging|production>
#       Koşunun ref'i bu ortama yayın yapabilir mi (REF, MODE env'den)?
#       production: yalnız refs/heads/master. staging: refs/heads/development;
#       YALNIZ mode=apk iken APK_BRANCHES (vars.STAGING_APK_BRANCHES, boşlukla
#       ayrılmış glob'lar, varsayılan "development") dalları da. Değilse durur.
#   release.sh assert-app-id <ios|android> <build-profile> <expected-id>
#       Profil env'iyle çözümlenen config'te (npx expo config --type public)
#       ios.bundleIdentifier / android.package beklenen değer değilse durur.
#       Ör. staging Android'in production Play uygulamasına (com.tarodan.app)
#       gitmesini build'den ÖNCE engeller.
#   release.sh build-submit <ios|android> <build-profile> <submit-profile|-> [expected-id]
#       `eas build --wait` alır, build id'sini çıkarır ve (submit profili `-`
#       değilse) TAM O build'i `eas submit --id` ile gönderir. `--latest`
#       kullanılmaz: paralel bitmiş başka profilin build'ini (ör. staging koşarken
#       biten production build'i) yanlış mağaza kaydına gönderebilirdi.
#       Build JSON'u ./eas-build.json'a yazılır; id GITHUB_OUTPUT'a `build_id`.
#       expected-id verilirse, gönderimden ÖNCE bitmiş build'in appIdentifier'ı
#       ona eşit olmalı (eşit değil ya da okunamıyorsa gönderilmez).
#       FP env'i verilirse build mesajına `ci-fp:<FP>` damgalanır ve EAS'in
#       runtime'ı tutmazsa uyarılır (plan'daki döngü koruması bunu okur).
#       Build'den ÖNCE Maestro/E2E test kancası denetimi: profil env'inde ya da
#       profilin EAS ortamında (proje + hesap kapsamı) EXPO_PUBLIC_MAESTRO* varsa durur.
#       OTA ve fingerprint yolları aynı denetimi `require_public_env`'de yapar.
#
# Neden profil env'i burada yükleniyor: `eas update` eas.json'daki build
# profilinin `env` bloğunu OKUMAZ; EXPO_PUBLIC_* değerlerini runner ortamından
# bundle'a gömer. Eksik kalırsa (a) app.config.js base config üretir → fingerprint
# build'den farklı olur → OTA hiçbir binary'ye ULAŞMAZ; (b) API adresi boş kalır →
# bundle localhost'a bakar. Değerleri doğrudan eas.json'dan okumak eski "workflow
# env bloğunu eas.json ile elle senkron tut" kuralını kopyasız hale getirir.
set -euo pipefail
# Bash `x="$(...)"` içindeki alt kabukta set -e'yi DÜŞÜRÜR (inherit_errexit
# yoksa): iç içe komut ikamelerinde hata ortada kalır. CI (bash 5) bunu açar;
# macOS'un bash 3.2'sinde yok. Bu yüzden iç içe ikamelerde ayrıca açıkça
# `|| die` / `|| exit 1` kullanılır — ikisinde de aynı davranış (testler iki
# sürümde de koşuldu).
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

# Maestro/E2E test kancalarını açan değişkenler (src/config/maestro.ts: auto-login,
# maskesiz şifre, form ön doldurma). Yayına giden bundle'da ASLA bulunmaz: runner'dan
# sızmış değer `load_profile_env`'de silinir, profilde varsa `assert_no_test_hooks` durur.
TEST_HOOK_ENV="EXPO_PUBLIC_MAESTRO EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN EXPO_PUBLIC_MAESTRO_EMAIL EXPO_PUBLIC_MAESTRO_PASSWORD"

# Profil env'ini bu kabuğa export eder. Process substitution (`< <(...)`)
# KULLANILMAZ: içindeki hata set -e'ye ulaşmaz ve döngü boş env ile sessizce
# devam ederdi (→ API adresi boş bir OTA). Önce çıktı alınır, hata varsa durulur.
# Runner'dan sızmış eski değerler önce temizlenir: doğrulama yalnız eas.json'dan
# gelen değerleri görsün (test kancası değişkenleri dahil — `eas update` runner
# env'ini bundle'a gömer).
load_profile_env() {
  local profile="$1" lines line key
  lines="$(profile_env "$profile")" || die "eas.json build.$profile env'i okunamadı"
  for key in $REQUIRED_PUBLIC_ENV $TEST_HOOK_ENV; do unset "$key"; done
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
  assert_no_test_hooks "$profile"
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

# Yüklenmiş profil env'inde Maestro/E2E test kancası açık mı? Açıksa yayın durur.
assert_no_test_hooks() {
  local profile="$1" key
  for key in $TEST_HOOK_ENV; do
    [ -z "${!key:-}" ] \
      || die "eas.json build.$profile.env.$key tanımlı — Maestro/E2E test kancaları yayına giden build/OTA'ya giremez."
  done
}

# Bir build profilinin EAS bulutunda kullandığı ortam (eas-cli kuralı): eas.json'da
# `environment` varsa o; yoksa developmentClient → development, internal dağıtım →
# preview, aksi halde (mağaza) production. Ör. `staging` mağaza profili → production.
eas_build_environment() {
  node -e '
    const p = (require(process.argv[1]).build || {})[process.argv[2]];
    if (!p) { console.error("eas.json: build." + process.argv[2] + " yok"); process.exit(1); }
    console.log(p.environment || (p.developmentClient ? "development" : p.distribution === "internal" ? "preview" : "production"));
  ' "$ROOT/eas.json" "$1"
}

# Store build'i öncesi: profil env'i (eas.json) ve EAS sunucusundaki ortam değişkenleri
# (profilin kullandığı ortam; proje VE hesap kapsamı) test kancası taşımıyor mu? EAS bulut
# build'i runner env'ini değil eas.json + EAS ortam değişkenlerini kullanır; hepsi burada
# denetlenir. `eas env:list` okunamazsa build DURUR (kapalı-başarısız).
assert_release_build_env() {
  local profile="$1" environment scope vars
  ( load_profile_env "$profile"; assert_no_test_hooks "$profile" ) || exit 1
  environment="$(eas_build_environment "$profile")" || die "build.$profile için EAS ortamı çözülemedi"
  for scope in project account; do
    vars="$(eas env:list "$environment" --scope "$scope" --format short)" \
      || die "EAS $environment ortam değişkenleri ($scope kapsamı) okunamadı — test kancası denetimi yapılamadan $profile build'i alınmaz."
    if printf '%s\n' "$vars" | grep -Eq '(^|[^A-Z_])EXPO_PUBLIC_MAESTRO'; then
      die "EAS $environment ortamında ($scope kapsamı) EXPO_PUBLIC_MAESTRO* değişkeni var — Maestro/E2E test kancaları $profile build'ine giremez."
    fi
  done
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
  state="$(classify_builds "$tmp" "$runtime")" || die "EAS build listesi çözümlenemedi"
  if [ "$state" = need-submissions ]; then
    eas submit:list --platform "$platform" --limit 50 --json --non-interactive > "$tmp/submissions.json" \
      || die "eas submit:list başarısız ($platform)"
    state="$(classify_builds "$tmp" "$runtime")" || die "EAS build listesi çözümlenemedi"
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

# [exclude-sha]: o commit'ten alınmış build'ler sayılmaz. Plan bir koşu yeniden
# çalıştırıldığında (ör. bir platform takıldı, "Re-run") kendi az önce aldığı
# build'i "son production build'i" sanıp "sürüm artmadı" demesin.
last_store_version() {
  local platform="$1" profile="$2" exclude="${3:-}" out
  out="$(eas build:list --platform "$platform" --build-profile "$profile" \
    --status finished --limit 20 --json --non-interactive)" \
    || die "eas build:list başarısız ($platform/$profile)"
  printf '%s' "$out" | node -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
      const ex = process.argv[1];
      const b = JSON.parse(s || "[]").find((x) => !ex || x.gitCommitHash !== ex);
      if (b && b.appVersion) console.log(b.appVersion);
    });' "$exclude"
}

version_gt() {
  [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -n1)" = "$1" ]
}

# X.Y.Z (yalnız rakam, üç parça) değilse 1 ile döner.
is_xyz() {
  case "$1" in
    *[!0-9.]*|.*|*.|*..*|'') return 1 ;;
  esac
  [ "$(printf '%s' "$1" | tr -cd . | wc -c | tr -d ' ')" = 2 ]
}

# app.json'daki expo.version (dosya göreli ya da mutlak yol olabilir; require()
# KULLANILMAZ — göreli yolu paket adı sanar).
app_version() {
  local file="${1:-$ROOT/app.json}"
  node -e '
    const j = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const v = j && j.expo && j.expo.version;
    if (typeof v !== "string" || !v) { console.error(`${process.argv[1]}: expo.version yok`); process.exit(1); }
    console.log(v);
  ' "$file" || die "app.json sürümü okunamadı ($file)"
}

# Tag prefix of mobile releases (release-bookkeeping in mobile-production.yml).
TAG_PREFIX=mobile-v

# Highest released X.Y.Z (see the header). Deliberately NOT "reachable from a ref":
# release-bookkeeping tags the master merge commit, which development never
# contains (master only gets merge commits development does not have).
latest_release() {
  local below="${1:-}" tags v best=""
  if [ -n "$below" ]; then is_xyz "$below" || die "latest-release: '$below' is not X.Y.Z"; fi
  tags="$(git -C "$ROOT" tag -l "$TAG_PREFIX*")" || die "latest-release: cannot list git tags in $ROOT"
  for v in $(printf '%s\n' "$tags" | sed "s/^$TAG_PREFIX//" | { grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' || true; }); do
    if [ -n "$below" ] && ! version_gt "$below" "$v"; then continue; fi
    if [ -z "$best" ] || version_gt "$v" "$best"; then best="$v"; fi
  done
  if [ -n "$best" ]; then echo "$best"; fi
}

# The next release version (see the header). Only stdout carries the version, so
# `v="$(release.sh next-version)"` works; everything else goes to stderr.
next_version() {
  local ref="${1:-HEAD}" base tag counts level major minor patch ignored next current x y z
  git -C "$ROOT" rev-parse -q --verify "$ref^{commit}" >/dev/null \
    || die "next-version: '$ref' is not a commit in $ROOT"
  [ "$(git -C "$ROOT" rev-parse --is-shallow-repository)" != true ] \
    || die "next-version: shallow clone; the commit range would be incomplete. Run: git fetch --unshallow --tags origin"
  base="$(latest_release)" || exit 1
  [ -n "$base" ] \
    || die "next-version: no ${TAG_PREFIX}X.Y.Z tag in this clone. Run git fetch --tags origin; on the very first run the seed tag (${TAG_PREFIX}<live version> on the released master commit) must be created first, with approval. No version is guessed."
  tag="$TAG_PREFIX$base"
  if [ -n "$(git -C "$ROOT" rev-list --no-merges -n 1 "$ref..$tag")" ]; then
    echo "::notice::next-version: $tag has commits that $ref does not contain (a hotfix not merged back yet?); counting from $tag anyway." >&2
  fi
  # %x1e separates the messages; headers and footers are classified in node.
  counts="$(git -C "$ROOT" log --no-merges --format='%B%x1e' "$tag..$ref" | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const n = { major: 0, minor: 0, patch: 0, ignored: 0 };
      for (const raw of s.split("\x1e")) {
        const lines = raw.replace(/^\n+/, "").split("\n");
        const header = lines[0];
        if (!header.trim()) continue;
        if (/^chore\(release\)!?:/.test(header)) n.ignored++;
        else if (/^[a-z]+(\([^)]*\))?!:/.test(header) || lines.slice(1).some((l) => /^BREAKING[ -]CHANGE:/.test(l))) n.major++;
        else if (/^feat(\([^)]*\))?:/.test(header)) n.minor++;
        else n.patch++;
      }
      const level = n.major ? "major" : n.minor ? "minor" : n.patch ? "patch" : "none";
      console.log([level, n.major, n.minor, n.patch, n.ignored].join(" "));
    });')" || die "next-version: cannot read the commits in $tag..$ref"
  read -r level major minor patch ignored <<< "$counts"
  [ "$level" != none ] || die "next-version: nothing to release in $tag..$ref (no commits besides chore(release))."
  IFS=. read -r x y z <<< "$base"
  case "$level" in
    major) next="$(( 10#$x + 1 )).0.0" ;;
    minor) next="$x.$(( 10#$y + 1 )).0" ;;
    patch) next="$x.$y.$(( 10#$z + 1 ))" ;;
  esac
  echo "next-version: $tag..$ref: $major breaking, $minor feat, $patch other, $ignored chore(release) ignored -> $level -> $next" >&2
  current="$(git -C "$ROOT" show "$ref:app.json" | app_version /dev/stdin)" || die "next-version: cannot read app.json at $ref"
  is_xyz "$current" || die "next-version: app.json at $ref holds '$current', not X.Y.Z; fix it by hand"
  if version_gt "$current" "$next"; then
    echo "::notice::next-version: app.json at $ref already holds $current (> computed $next); the manual override wins." >&2
    next="$current"
  fi
  echo "$next"
}

# Sets expo.version for the release PR. Only the `"version": "<current>"` line
# changes (the rest of the file stays byte for byte); both versions must be
# X.Y.Z (a "1.2.4-rc.1" would sort above 1.2.4 and slip past VERSION-GATE).
set_version() {
  local next="${1:-}" file="${2:-$ROOT/app.json}" current
  is_xyz "$next" || die "set-version: '$next' is not X.Y.Z"
  current="$(app_version "$file")" || exit 1
  is_xyz "$current" || die "set-version: $file holds '$current', not X.Y.Z; fix it by hand"
  if [ "$current" = "$next" ]; then
    echo "set-version: $file is already at $next."
    return 0
  fi
  version_gt "$next" "$current" \
    || die "set-version: $next is lower than $file ($current); a release never lowers the version. Edit app.json by hand if that is really intended."
  node -e '
    const fs = require("fs");
    const [file, from, to] = process.argv.slice(1);
    const src = fs.readFileSync(file, "utf8");
    const re = new RegExp(`("version"\\s*:\\s*")${from.replace(/\./g, "\\.")}(")`, "g");
    const hits = src.match(re) || [];
    if (hits.length !== 1) { console.error(`${file}: "version": "${from}" must occur exactly once (found ${hits.length})`); process.exit(1); }
    const out = src.replace(re, `$1${to}$2`);
    if (JSON.parse(out).expo.version !== to) { console.error("expo.version was not updated"); process.exit(1); }
    fs.writeFileSync(file, out);
  ' "$file" "$current" "$next" || die "set-version: cannot update $file"
  echo "set-version: $current -> $next ($file)"
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

app_id_key() {
  case "$1" in
    ios) echo bundleIdentifier ;;
    android) echo package ;;
    *) die "bilinmeyen platform: '$1'" ;;
  esac
}

assert_app_id() {
  local platform="$1" profile="$2" expected="$3" key actual
  key="$(app_id_key "$platform")"
  actual="$(
    load_profile_env "$profile"
    cd "$ROOT"
    npx expo config --type public --json \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const c=JSON.parse(s)[process.argv[1]]||{};console.log(c[process.argv[2]]||"")})' "$platform" "$key"
  )" || die "expo config çözümlenemedi ($platform/$profile)"
  [ "$actual" = "$expected" ] \
    || die "$profile profilinin $platform.$key değeri '$actual', beklenen '$expected' — yanlış uygulamaya build/gönderim yapılmaz. (app.config.js / EXPO_PUBLIC_ENVIRONMENT'ı kontrol et.)"
  echo "OK: $profile $platform.$key = $actual"
}

build_submit() {
  local platform="$1" profile="$2" submit_profile="$3" expected="${4:-}" id runtime actual
  local -a extra=()
  cd "$ROOT"
  # CI'ın hesapladığı fingerprint build mesajına damgalanır (ci-fp:<fp>);
  # plan, EAS'in sonradan hesapladığı runtime ile art arda tutmazlığı buradan
  # yakalar (bkz. build_history — sonsuz build döngüsü koruması).
  if [ -n "${FP:-}" ]; then extra=(--message "ci-fp:$FP"); fi
  assert_release_build_env "$profile"
  eas build --platform "$platform" --profile "$profile" "${extra[@]+"${extra[@]}"}" \
    --non-interactive --wait --json > eas-build.json \
    || die "eas build başarısız ($platform/$profile)"
  id="$(build_json_field id)"
  [ -n "$id" ] || die "eas build --json build id döndürmedi ($platform/$profile)"
  echo "build id: $id"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "build_id=$id" >> "$GITHUB_OUTPUT"; fi
  runtime="$(build_json_field runtime)"
  if [ -n "${FP:-}" ] && [ "$runtime" != "$FP" ]; then
    echo "::warning::EAS bu build'e runtime '${runtime:-?}' damgaladı, CI fingerprint'i '$FP' idi. Bu runtime'a CI'ın OTA'ları ULAŞMAZ; tekrarlarsa plan otomatik build'i durdurur. Yerelde: npx expo-updates fingerprint:generate ile eas build:view $id karşılaştır."
  fi
  if [ -n "$expected" ]; then
    actual="$(build_json_field appIdentifier)"
    [ "$actual" = "$expected" ] \
      || die "build $id appIdentifier '${actual:-okunamadı}', beklenen '$expected' — GÖNDERİLMEDİ."
  fi
  if [ "$submit_profile" != "-" ]; then
    # eas submit de app.config.js'i çözer: Android'de Play service account'unu paket adına göre
    # (`com.tarodan.app` / `.staging`) arar. Build profilinin env'i (EXPO_PUBLIC_ENVIRONMENT=preview)
    # yüklenmezse staging gönderimi production paketinin kimliğini arar ve "Google Service Account
    # Keys cannot be set up in --non-interactive mode" ile düşer.
    load_profile_env "$profile"
    eas submit --platform "$platform" --profile "$submit_profile" --id "$id" \
      --non-interactive || die "eas submit başarısız ($platform/$submit_profile, build $id)"
  fi
}

build_json_field() {
  node -e '
    const b = require(process.argv[1]); const x = Array.isArray(b) ? b[0] : b;
    const v = { id: x && x.id, runtime: x && ((x.runtime && x.runtime.version) || x.runtimeVersion),
      appIdentifier: x && x.appIdentifier }[process.argv[2]];
    if (v) console.log(v);
  ' "$ROOT/eas-build.json" "$1"
}

# Bir profilin son build'lerinden iki sinyal, tek eas çağrısıyla:
#   today=<n>   bugün (UTC) başlatılmış build sayısı — durumdan bağımsız
#               (hata/iptal de kotadan yemiş olabilir; güvenli taraf)
#   streak=<n>  CI'ın damgaladığı fingerprint (message "ci-fp:<fp>") ile EAS'in
#               runtime'ı, en yeni bitmiş CI build'lerinden geriye ART ARDA kaç
#               kez tutmadı
#   last=<ci-fp>→<eas-runtime>  en son tutmazlık (mesaj için)
build_history() {
  local platform="$1" profile="$2" out
  out="$(eas build:list --platform "$platform" --build-profile "$profile" \
    --limit 50 --json --non-interactive)" || die "eas build:list başarısız ($platform/$profile)"
  printf '%s' "$out" | node -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
      const builds = JSON.parse(s || "[]");
      const today = new Date().toISOString().slice(0, 10);
      const rt = (b) => (b.runtime && b.runtime.version) || b.runtimeVersion;
      const n = builds.filter((b) => String(b.createdAt || "").slice(0, 10) === today).length;
      let streak = 0, last = "";
      for (const b of builds) {
        const m = /^ci-fp:(\S+)/.exec(b.message || "");
        if (!m || String(b.status).toUpperCase() !== "FINISHED") continue;
        if (rt(b) === m[1]) break;
        streak++; if (!last) last = m[1] + "→" + (rt(b) || "?");
      }
      console.log("today=" + n + " streak=" + streak + " last=" + last);
    });'
}

# Otomatik build'den önce iki koruma (yalnız mode=auto; elle mode=build atlar):
#   1. Fingerprint tutmazlığı döngüsü (her ortam): son FP_MISMATCH_LIMIT (2) CI
#      build'inde art arda tutmazlık → blocked. Aksi halde her push "bu runtime
#      için build yok" görüp yeni build alır ve kotayı bitirir.
#   2. Günlük kota (staging): bugün MAX_BUILDS_PER_DAY (vars.STAGING_MAX_BUILDS_PER_DAY,
#      varsayılan 2) build alınmışsa skip + uyarı. Ücretsiz plan iOS'ta ayda 15
#      build veriyor.
# Sonucu stdout'a yazar: build | skip | blocked.
build_guard() {
  local env="$1" platform="$2" hist today streak last max limit
  hist="$(build_history "$platform" "$BUILD_PROFILE")" || exit 1
  today="$(printf '%s' "$hist" | sed -E 's/.*today=([0-9]+).*/\1/')"
  streak="$(printf '%s' "$hist" | sed -E 's/.*streak=([0-9]+).*/\1/')"
  last="${hist##*last=}"
  limit="${FP_MISMATCH_LIMIT:-2}"
  if [ "$streak" -ge "$limit" ]; then
    echo "::error::$platform: son $streak CI build'inde CI fingerprint'i ile EAS runtime'ı tutmadı (son: $last). Sonsuz build döngüsünü önlemek için otomatik build DURDURULDU. Sebebi giderip (ör. runner ile EAS arasında farklı node_modules/env) gh workflow run mobile-$env.yml --ref $BRANCH -f mode=build -f platform=$platform ile elle alın." >&2
    echo blocked; return 0
  fi
  if [ "$env" = staging ]; then
    max="${MAX_BUILDS_PER_DAY:-2}"
    case "$max" in ''|*[!0-9]*) echo "::warning::STAGING_MAX_BUILDS_PER_DAY='$max' sayı değil — 2 kullanılıyor." >&2; max=2 ;; esac
    if [ "$today" -ge "$max" ]; then
      echo "::warning::$platform: bugün (UTC) zaten $today staging build'i alındı (sınır $max, vars.STAGING_MAX_BUILDS_PER_DAY). Kota koruması: build ALINMADI, OTA da yok (bu runtime'ın binary'si yok). Yarın ilk push'ta ya da gh workflow run mobile-staging.yml --ref development -f mode=build -f platform=$platform ile." >&2
      echo skip; return 0
    fi
  fi
  echo build
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
  local ota="" blocked="" kind="" source="${SOURCE_REF:-}" gated await
  msg="$(printf '%s' "${COMMIT_MSG:-manual $env ($mode) ${sha:0:7}}" | head -n1)"
  output "message=$msg"

  if [ "$env" = staging ]; then
    if [ "$mode" = apk ]; then
      output apk=true ios=skip android=skip 'ota_matrix=[]' blocked= decided=true
      return 0
    fi
    output apk=false
  fi
  if [ "$env" = production ]; then
    version="$(node -p "require(process.argv[1]).expo.version" "$ROOT/app.json")"
    # Merge'ün türü. Kaynak bilinmiyorsa (API okunamadı, elle tetikleme) SÜRÜM
    # sayılır: en kötü ihtimalle bir hotfix "sürümü artır" hatasıyla durur; asla
    # onaysız ya da istenmemiş bir OTA hazırlanmaz.
    case "$source" in
      hotfix/*) kind=hotfix ;;
      *) kind=release ;;
    esac
    echo "production: kaynak '${source:-?}' → $kind (mode=$mode)"
  fi

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

    gated=false await=false
    if [ "$env" = production ] && [ "$mode" = auto ] && [ "$kind" = release ]; then
      # SÜRÜM: development → master merge'ü HER ZAMAN store build'idir; yalnız JS
      # değişmiş olsa da OTA'ya düşmez. Önce sürüm kapısı (VERSION-GATE; aşağıdaki
      # kıyasın aynısı, bu commit'in kendi build'leri hariç): artmamışsa ne build ne
      # OTA — ve koşu kırmızı.
      gated=true
      last="$(last_store_version "$p" "$BUILD_PROFILE" "$sha")"
      if [ -n "$last" ] && ! version_gt "$version" "$last"; then
        echo "::error::$p: sürüm merge'ü (kaynak: ${source:-bilinmiyor}) ama app.json expo.version ($version) son production build'inin sürümünden ($last) büyük değil — store build ALINMADI, OTA da yok. Yeni sürüm için development'ta expo.version'ı artırıp yeni PR aç. Aynı sürümün yeni build'i (ör. App Review reddi, sürüm henüz yayınlanmadıysa): gh workflow run mobile-production.yml --ref master -f mode=build -f platform=$p. DİKKAT: master artık yayınlanmamış kod içeriyor; buradan çıkacak bir OTA (hotfix/* ya da mode=ota) o kodu da canlıya taşır. Merge yalnız uygulamaya girmeyen dosyaları (test, CI, belge) değiştirdiyse bu hata yok sayılabilir."
        decision=blocked
      else
        case "${state%% *}" in
          available)
            decision=skip
            echo "::notice::$p: bu sürümün production binary'si zaten gönderilmiş ($build_id) — ikinci build alınmadı." ;;
          pending)
            decision="wait"
            echo "::warning::$p: bu sürümün production build'i/gönderimi sürüyor ($build_id) — ikinci build alınmadı." ;;
          *)
            decision=build
            echo "$p: sürüm ${last:-<ilk build>} → $version" ;;
        esac
      fi
    else
      case "$mode:${state%% *}" in
        build:*) decision=build ;;
        *:available)
          decision=ota
          if [ "$env" = production ]; then
            # Gönderilmiş ≠ yayınlanmış: OTA yalnız bu runtime'ın binary'sine iner.
            echo "::warning::$p: production OTA'sı yalnız bu runtime'ın binary'sine iner (build $build_id, app.json $version). Bu sürüm mağazada henüz yayınlanmadıysa (ör. incelemede) canlıdaki önceki sürümün kullanıcıları bu düzeltmeyi ALMAZ."
          fi ;;
        *:pending)
          if [ "$env" = staging ]; then
            # Binary geliyor ve AYNI runtime'ı taşıyor: OTA, build bitene kadar
            # bekleyip (await-binary) yayınlanır. Beklemek şart: expo-updates bir
            # güncellemeyi yalnız commitTime'ı gömülü JS'inkinden (build anı)
            # YENİYSE uygular; build JS'i paketlemeden önce yayınlanan bir OTA o
            # build'e hiç inmezdi. Yayınlanmasa da build sürerken gelen push'un
            # JS'i hiçbir cihaza ulaşmazdı.
            decision=ota
            await=true
            echo "::notice::$p: bu runtime ($fp) için build/gönderim sürüyor ($build_id) — OTA, build bitince yayınlanacak."
          elif [ "$mode" = ota ]; then
            decision=ota
            echo "::warning::$p: bu runtime ($fp) için build/gönderim sürüyor ($build_id) — OTA elle istendi; onaylanırsa binary'den ÖNCE çıkabilir ve ona İNMEYEBİLİR."
          else
            # Production OTA'sı onay ister; binary'si henüz olmayan bir runtime'a
            # onay istenmez. İkinci bir build de alınmaz.
            decision="wait"
            echo "::warning::$p: bu runtime ($fp) için build/gönderim sürüyor ($build_id) — OTA yayınlanmadı, ikinci build alınmadı. Bitince JS farkı için: gh workflow run mobile-$env.yml --ref $BRANCH -f mode=ota -f platform=$p"
          fi ;;
        ota:*)
          decision=ota
          echo "::warning::$p: bu runtime ($fp) için gönderilmiş bir $env binary'si yok ($state) — OTA elle istendi, hiçbir binary'ye ULAŞMAYABİLİR." ;;
        *) decision=build ;;
      esac
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
    # Sürüm merge'ünde kapı yukarıda zaten uygulandı (gated).
    if [ "$decision" = build ] && [ "$env" = production ] && [ "$gated" != true ]; then
      last="$(last_store_version "$p" "$BUILD_PROFILE" "$sha")"
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

    if [ "$decision" = build ] && [ "$mode" = auto ]; then
      decision="$(build_guard "$env" "$p")"
    fi

    output "$p=$decision"
    case "$decision" in
      ota)
        if [ "$await" = true ]; then
          ota="$ota{\"platform\":\"$p\",\"fp\":\"$fp\",\"await\":true},"
        else
          ota="$ota{\"platform\":\"$p\",\"fp\":\"$fp\"},"
        fi ;;
      blocked) blocked="$blocked $p" ;;
    esac
    summary "### $p → \`$decision\`" "- fingerprint: \`$fp\`" "- binary: $state"
    if [ -n "$version" ]; then summary "- app.json expo.version: \`$version\`"; fi
    if [ -n "$kind" ]; then summary "- merge: \`${source:-bilinmiyor}\` → $kind (mode=$mode)"; fi
  done

  output "ota_matrix=[${ota%,}]"
  output "blocked=${blocked# }"
  output decided=true
}

recheck() {
  local platform="$1" env="$2" state=none action=build guard await=false
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
      # plan'daki staging kuralıyla aynı: ikinci build yok; OTA o build bitince
      # yayınlanır (await-binary — commitTime gömülü JS'ten yeni olsun diye).
      action=ota
      await=true
      echo "::notice::Bu runtime için arada bir build/gönderim başlamış (${state#* }) — ikinci build alınmadı; OTA, o build bitince yayınlanacak." ;;
    production:available|production:pending)
      # Production OTA onay ister; burada sessizce OTA'ya dönülmez.
      action=skip
      echo "::warning::Bu runtime için arada bir production build'i oluştu ($state) — ikinci build alınmadı. JS farkı varsa: gh workflow run mobile-production.yml --ref master -f mode=ota -f platform=$platform" ;;
  esac
  # Kilit beklenirken başka build'ler alınmış olabilir: korumaları yeniden uygula.
  if [ "$action" = build ] && [ "${MODE:-auto}" = auto ]; then
    # Önce değişkene: `case "$(…)"` içindeki hata set -e'ye ulaşmaz.
    guard="$(build_guard "$env" "$platform")"
    case "$guard" in
      skip) action=skip ;;
      blocked) output "action=skip"; return 1 ;;
    esac
  fi
  output "await=$await"
  output "action=$action"
}

# Bu runtime'ın DERLENEN build'i kalmayana kadar bekler (staging OTA'sı; bkz.
# plan'daki pending kuralı). Gönderim (TestFlight / Play) BEKLENMEZ: commitTime
# yarışı için build'in JS'i paketlemiş olması yeter; build bittikten sonra
# yayınlanan OTA, gömülü JS'ten her zaman yenidir.
#   - EAS sorgusu geçici olarak başarısız olursa yeniden denenir (bekleme bir
#     API hatası yüzünden OTA'yı kaybetmesin).
#   - Süre saatle ölçülür (AWAIT_MINUTES, varsayılan 75 — job sınırı 120 dk); dolarsa
#     uyarıyla döner ve OTA yine yayınlanır.
# Build başarısız/iptal olursa da döner: OTA zararsızdır (bu runtime'da binary yok).
await_binary() {
  local platform="$1" env="$2" fp="$3" limit="${AWAIT_MINUTES:-75}" interval="${AWAIT_INTERVAL:-60}" start n
  env_config "$env"
  [ -n "$fp" ] || die "await-binary: fingerprint boş"
  start=$SECONDS
  while :; do
    if n="$(builds_in_flight "$platform" "$(binary_profiles "$env" "$platform")" "$fp" "$CHANNEL")"; then
      if [ "$n" = 0 ]; then
        echo "$platform: runtime $fp için derlenen build kalmadı — OTA yayınlanıyor."
        return 0
      fi
    else
      echo "::warning::$platform: EAS build listesi okunamadı — yeniden denenecek."
    fi
    if [ $((SECONDS - start + interval)) -ge $((limit * 60)) ]; then
      echo "::warning::$platform: runtime $fp için build $limit dk sonra hâlâ derleniyor (ya da durum okunamıyor) — OTA yine yayınlanıyor."
      return 0
    fi
    sleep "$interval"
  done
}

# Bu runtime'ın kuyrukta / derlenen build sayısı (gönderim durumu hariç). EAS
# sorgusu başarısızsa 1 ile döner (çağıran yeniden dener).
builds_in_flight() {
  local platform="$1" profiles="$2" runtime="$3" channel="${4:-}" profile out n total=0
  local -a list
  IFS=, read -r -a list <<< "$profiles"
  for profile in "${list[@]}"; do
    local args=(build:list --platform "$platform" --build-profile "$profile"
      --runtime-version "$runtime" --limit 50 --json --non-interactive)
    if [ -n "$channel" ]; then args+=(--channel "$channel"); fi
    out="$(eas "${args[@]}")" || return 1
    n="$(printf '%s' "$out" | node -e '
      let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
        const rt = (b) => (b.runtime && b.runtime.version) || b.runtimeVersion;
        const flying = new Set(["NEW", "IN_QUEUE", "IN_PROGRESS", "PENDING_CANCEL"]);
        const st = (b) => String(b.status || "").toUpperCase().replace(/-/g, "_");
        console.log(JSON.parse(s || "[]").filter((b) => rt(b) === process.argv[1] && flying.has(st(b))).length);
      });' "$runtime")" || return 1
    total=$((total + n))
  done
  echo "$total"
}

guard_ref() {
  local env="$1" ref="${REF:-}" mode="${MODE:-auto}" branch pattern
  env_config "$env"
  [ "$ref" = "refs/heads/$BRANCH" ] && { echo "OK: $ref → $env"; return 0; }
  if [ "$env" = staging ] && [ "$mode" = apk ] && [ "${ref#refs/heads/}" != "$ref" ]; then
    branch="${ref#refs/heads/}"
    for pattern in ${APK_BRANCHES:-development}; do
      # shellcheck disable=SC2254 # desen bilerek glob (ör. feature/*)
      case "$branch" in $pattern) echo "OK: $ref → ad-hoc APK (izinli: $pattern)"; return 0 ;; esac
    done
    die "ad-hoc APK '$branch' dalından istenmiş; izinli dallar (vars.STAGING_APK_BRANCHES): ${APK_BRANCHES:-development}"
  fi
  die "$env yalnız refs/heads/$BRANCH'ten yayınlanır (ref: '${ref:-?}', mode: $mode)."
}

cmd="${1:-}"
shift || true
case "$cmd" in
  profile-env) profile_env "$@" ;;
  fingerprint) fingerprint "$@" ;;
  build-state) build_state "$@" ;;
  guard-ref) guard_ref "$@" ;;
  assert-app-id) assert_app_id "$@" ;;
  last-store-version) last_store_version "$@" ;;
  version-gt) version_gt "$@" ;;
  publish-ota) publish_ota "$@" ;;
  plan) plan "$@" ;;
  recheck) recheck "$@" ;;
  await-binary) await_binary "$@" ;;
  latest-release) latest_release "$@" ;;
  next-version) next_version "$@" ;;
  set-version) set_version "$@" ;;
  app-version) app_version "$@" ;;
  build-submit) build_submit "$@" ;;
  *) die "bilinmeyen komut: '$cmd' (bkz. dosya başı)" ;;
esac
