# iOS Production Yayın Hattı Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `master` branch'ine yapılan sürüm yükseltmeli merge'lerin, mevcut **Tarodan** iOS uygulamasına otomatik TestFlight build'i üretmesi.

**Architecture:** Hat büyük ölçüde yazılmış durumda (`.github/workflows/mobile-production.yml`, `eas.json` production profili, `EXPO_TOKEN` secret'ı). Bu plan iki şey yapar: (1) workflow'u iOS'a daraltır — Android bilinçli olarak ertelendi, (2) `master` branch'ini açıp hattı submit'siz bir deneme build'iyle doğrular.

**Tech Stack:** GitHub Actions · EAS Build/Submit (Expo) · Jest (workflow regresyon testi) · git · `gh` CLI

## Global Constraints

- **Android bu turda uygulanmaz.** `mobile-production.yml` yalnız iOS build/submit yapar. Android planı spec §7'de; geri eklenmesi Play service account + Firebase çift-client `google-services.json` gerektirir.
- **Onay kapısı eklenmez.** GitHub `production` Environment kurulmaz; build biter bitmez submit çalışır (yalnız gerçek yayında).
- **Sürüm kapısı korunur.** `master` push'unda build yalnız `app.json` `expo.version` bir önceki commit'e göre DEĞİŞTİYSE çalışır. Bu mantık silinmez, gevşetilmez.
- **`EXPO_TOKEN` guard'ı korunur.** Secret yoksa workflow sessiz no-op olur.
- Prod app kimliği: bundle `com.tarodan.app` · ASC app `6786614139` · Apple Team `P2628CQK26` · EAS proje `a1d4149d-bbbc-49a8-9a26-d2b81cd842d3` (`mki19xcis-organization`). Bu değerler **değiştirilmez**.
- `eas.json` production profili `EXPO_PUBLIC_API_URL=https://tarodan.com.tr/api` kullanır — değiştirilmez.
- **Production API şu an 500 dönüyor.** Bu planda gerçek bir yayın (submit'li prod build) YAPILMAZ. Sürüm yükseltme ve gerçek yayın, prod API canlıya alındıktan sonra ayrı bir işlemdir.
- Jest bu repoda testler bittikten sonra process'i kapatmaz: `npx jest <desen> --forceExit 2>&1 | tail -25`.
- Commit mesajı sonunda: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

## Dosya haritası

| Dosya | Sorumluluk | İşlem |
|---|---|---|
| `.github/workflows/mobile-production.yml` | master → prod iOS build/submit | Değiştir (iOS'a daralt) |
| `src/config/__tests__/releaseWorkflow.test.ts` | Prod yayın workflow'unun sözleşmesini kilitler | Oluştur |

`src/config/__tests__/apiUrl.test.ts` ortam **adresleri** regresyonundan sorumlu; yayın hattı sözleşmesi ayrı bir dosyaya yazılır (tek sorumluluk).

---

## Task 1: Prod workflow'unu iOS'a daralt

**Files:**
- Create: `src/config/__tests__/releaseWorkflow.test.ts`
- Modify: `.github/workflows/mobile-production.yml`

**Interfaces:**
- Consumes: —
- Produces: `mobile-production.yml` — `master` push (sürüm kapılı) ve `workflow_dispatch` (girdi: `submit` boolean) ile tetiklenen, yalnız iOS build/submit yapan workflow. Task 3 ve 4 bunu tetikler.

- [ ] **Step 1: Failing test'i yaz**

`src/config/__tests__/releaseWorkflow.test.ts` oluştur:

```ts
/**
 * Prod yayın hattı sözleşmesi. Android bilinçli olarak ertelendi (spec §7:
 * Play service account + Firebase çift-client google-services.json gerekiyor).
 * Android submit'i bu önkoşullar karşılanmadan geri eklenirse prod yayını kırar.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const workflow = fs.readFileSync(
  path.join(ROOT, '.github/workflows/mobile-production.yml'),
  'utf8',
);

describe('mobile-production workflow', () => {
  it('yalnız iOS build eder — Android ertelendi', () => {
    expect(workflow).toContain('--platform ios --profile production');
    expect(workflow).not.toContain('--platform all');
  });

  it('Android submit adımı içermez', () => {
    expect(workflow).not.toContain('eas submit --platform android');
  });

  it('iOS submit adımı korunur', () => {
    expect(workflow).toContain(
      'eas submit --platform ios --profile production --latest --non-interactive',
    );
  });

  it('master push ile tetiklenir', () => {
    expect(workflow).toMatch(/branches:\s*\[master\]/);
  });

  it('sürüm kapısı korunur (her master merge build tetiklemez)', () => {
    expect(workflow).toContain("require('./app.json').expo.version");
    expect(workflow).toContain('vergate');
  });

  it('EXPO_TOKEN guard korunur', () => {
    expect(workflow).toContain('secrets.EXPO_TOKEN');
  });
});
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest releaseWorkflow --forceExit 2>&1 | tail -25`

Expected: FAIL — "yalnız iOS build eder" ve "Android submit adımı içermez" kırmızı (workflow şu an `--platform all` ve Android submit içeriyor). Diğer 4 test yeşil olmalı (mevcut davranış).

- [ ] **Step 3: Workflow'u iOS'a daralt**

`.github/workflows/mobile-production.yml`'de üç düzenleme:

**(a)** Dosya başındaki yorumda Android referansını kaldır. Şu satır:

```
# master push -> prod build + submit (mevcut Tarodan app: TestFlight + Play internal).
```

şununla değiştir:

```
# master push -> prod iOS build + submit (mevcut Tarodan app: TestFlight).
# Android ERTELENDİ (spec 2026-07-31 §7): Play service account + Firebase
# çift-client google-services.json hazır olunca --platform android geri eklenir.
```

**(b)** Job adını iOS'a daralt. Şu satır:

```yaml
    name: EAS Build + Submit (iOS & Android)
```

şununla değiştir:

```yaml
    name: EAS Build + Submit (iOS)
```

**(c)** Build adımını daralt ve Android submit adımını sil. Şu üç adım bloğu:

```yaml
      - name: EAS build (iOS + Android, production)
        if: steps.guard.outputs.skip != 'true' && (steps.vergate.outputs.changed == 'true' || github.event_name == 'workflow_dispatch')
        run: eas build --platform all --profile production --non-interactive --wait
      - name: EAS submit — iOS (TestFlight, mevcut app)
        if: steps.guard.outputs.skip != 'true' && (steps.vergate.outputs.changed == 'true' || (github.event_name == 'workflow_dispatch' && inputs.submit))
        run: eas submit --platform ios --profile production --latest --non-interactive
      - name: EAS submit — Android (Play internal)
        if: steps.guard.outputs.skip != 'true' && (steps.vergate.outputs.changed == 'true' || (github.event_name == 'workflow_dispatch' && inputs.submit))
        run: eas submit --platform android --profile production --latest --non-interactive
```

şu iki adımla değiştir:

```yaml
      - name: EAS build (iOS, production)
        if: steps.guard.outputs.skip != 'true' && (steps.vergate.outputs.changed == 'true' || github.event_name == 'workflow_dispatch')
        run: eas build --platform ios --profile production --non-interactive --wait
      - name: EAS submit — iOS (TestFlight, mevcut app)
        if: steps.guard.outputs.skip != 'true' && (steps.vergate.outputs.changed == 'true' || (github.event_name == 'workflow_dispatch' && inputs.submit))
        run: eas submit --platform ios --profile production --latest --non-interactive
```

Başka hiçbir satıra dokunma — sürüm kapısı, guard, `concurrency`, `timeout-minutes`, `workflow_dispatch` girdisi aynen kalır.

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest releaseWorkflow --forceExit 2>&1 | tail -25`

Expected: PASS — 6 test yeşil.

- [ ] **Step 5: YAML'ın hâlâ geçerli olduğunu doğrula**

Run:

```bash
node -e "const y=require('fs').readFileSync('.github/workflows/mobile-production.yml','utf8'); if(!/^on:/m.test(y)) throw new Error('on: bloğu kayıp'); console.log('ok: satır sayısı', y.split('\n').length)"
```

Expected: `ok: satır sayısı <N>` yazar, hata fırlatmaz.

Ayrıca gözle doğrula: dosyada `--platform all` ve `eas submit --platform android` **hiç geçmiyor**:

```bash
grep -n "platform" .github/workflows/mobile-production.yml
```

Expected: yalnız iki satır — build'de `--platform ios`, submit'te `--platform ios`.

- [ ] **Step 6: Tüm test paketinin hâlâ yeşil olduğunu doğrula**

Run: `npx jest --forceExit 2>&1 | tail -8`

Expected: 0 failed. (Bu çalışmadan önceki temel: 86 suite / 541 test yeşil; bu task 1 suite / 6 test ekler.)

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/mobile-production.yml src/config/__tests__/releaseWorkflow.test.ts
git commit -m "$(cat <<'EOF'
ci(release): prod yayın workflow'unu iOS'a daralt

Android ertelendi (Play service account + Firebase çift-client
google-services.json hazır değil). Sözleşmeyi kilitleyen regresyon
testi eklendi: Android submit'i önkoşullar karşılanmadan geri
eklenirse test kırmızı olur.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `main`'i uzağa push et, staging hattının çalıştığını doğrula

**Files:** — (git/ops işlemi, kod değişikliği yok)

**Interfaces:**
- Consumes: Task 1'in commit'i (`main` üzerinde)
- Produces: `origin/main` güncel. Task 3 `master`'ı bu noktadan açar.

> **Bu adım gerçek bir EAS build tetikler** ve Tarodan Staging TestFlight'ına submit eder. Tasarımda onaylandı: P0 işinin elle test edilebilmesi için staging build'i gerekli.

- [ ] **Step 1: Ne push edileceğini doğrula**

Run:

```bash
git status -sb | head -2
git log --oneline origin/main..main | wc -l
```

Expected: `## main...origin/main [ahead N]` ve N ≥ 30 (29 P0 commit'i + Task 1). Çalışma ağacı temiz olmalı.

- [ ] **Step 2: Staging'in full build mi OTA mı sınıflandıracağını önceden gör**

Run:

```bash
git diff --name-only origin/main..main | grep -E '^(package\.json|pnpm-lock\.yaml|app\.json|app\.config\.js|eas\.json|google-services\.json)$|^(ios|android|plugins|patches|credentials)/'
```

Expected: `app.json`, `eas.json`, `package.json`, `pnpm-lock.yaml` listelenir → `mobile-staging.yml` bunu **native değişiklik** sayar ve OTA değil **full build** çalıştırır. (Boş çıkarsa OTA olurdu — o zaman Step 4'teki beklenti değişir.)

- [ ] **Step 3: Push et**

```bash
git push origin main
```

- [ ] **Step 4: Tetiklenen workflow'ları doğrula**

Run:

```bash
sleep 20 && gh run list --branch main --limit 8
```

Expected: `Mobile Staging (OTA + Preview Build)` çalışıyor/kuyrukta. Ayrıca `CI`, `CodeQL`, `Secret Scan`, `Mobile Build` görünür.

Staging'in **build** moduna karar verdiğini teyit et:

```bash
gh run list --workflow=mobile-staging.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I{} gh run view {} --log 2>/dev/null | grep -m3 "mode=" || echo "log henüz hazır değil — Actions sekmesinden classify job'ının çıktısına bak"
```

Expected: `mode=build`.

- [ ] **Step 5: Kaydet**

Bu adımda commit yok. Build 15–25 dakika sürer; sonucunu beklemek Task 3'ü engellemez — `master` bağımsız açılabilir. Build bitince Tarodan Staging TestFlight'ında yeni sürüm görünmeli.

---

## Task 3: `master` branch'ini aç ve sürüm kapısının tuttuğunu doğrula

**Files:** — (git/ops işlemi)

**Interfaces:**
- Consumes: `origin/main` (Task 2)
- Produces: `origin/master` — prod tetikleyici branch'i. Task 4 bunu hedefler.

- [ ] **Step 1: `master`'ı `main`'den aç**

```bash
git checkout -b master main
git log --oneline -1
```

Expected: `main`'in ucuyla aynı commit.

- [ ] **Step 2: Push et**

```bash
git push -u origin master
```

- [ ] **Step 3: Prod build'in tetiklenMEdiğini doğrula — sürüm kapısının kanıtı**

Run:

```bash
sleep 20 && gh run list --workflow=mobile-production.yml --limit 3
```

Expected: Bir çalıştırma görünür ama **build yapmadan biter**. Log'da `expo.version değişmedi (1.0.0) — prod release skip.` notu olmalı:

```bash
gh run list --workflow=mobile-production.yml --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I{} gh run view {} --log 2>/dev/null | grep -m2 "prod release" || echo "log henüz hazır değil"
```

Expected: `prod release skip` içeren satır.

> Bu **istenen** davranıştır: `master`'a kod gelmesi tek başına yayın yapmaz. Yayın, sürüm yükseltmekle olur.

- [ ] **Step 4: `main`'e geri dön**

```bash
git checkout main
```

Sonraki geliştirme `main`'de sürer; `master`'a elle commit atılmaz (spec §8 notu: `ci.yml` `master` push'unda çalışmaz).

---

## Task 4: Submit'siz deneme prod build'i — imza zincirini doğrula

**Files:** — (ops doğrulaması)

**Interfaces:**
- Consumes: `origin/master` (Task 3), iOS'a daraltılmış workflow (Task 1)
- Produces: Hattın uçtan uca çalıştığının kanıtı. Sonrası: prod API canlı olunca sürüm yükselt + merge.

> Bu adım EAS build dakikası harcar ama **TestFlight'a hiçbir şey göndermez** (`submit=false`).

- [ ] **Step 1: Deneme build'ini tetikle**

```bash
gh workflow run mobile-production.yml --ref master -f submit=false
```

- [ ] **Step 2: Çalıştığını doğrula**

```bash
sleep 20 && gh run list --workflow=mobile-production.yml --limit 3
```

Expected: `workflow_dispatch` ile başlamış yeni bir çalıştırma `in_progress`.

- [ ] **Step 3: Sonucu izle**

```bash
gh run list --workflow=mobile-production.yml --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I{} gh run watch {}
```

Expected (15–25 dk): **success**. Adım listesinde `EAS build (iOS, production)` yeşil, `EAS submit — iOS` **atlanmış** (skipped) olmalı — `submit=false` verildiği için.

- [ ] **Step 4: Submit yapılmadığını teyit et**

```bash
gh run list --workflow=mobile-production.yml --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I{} gh run view {} --json jobs --jq '.jobs[].steps[] | "\(.conclusion)\t\(.name)"'
```

Expected: `EAS submit — iOS (TestFlight, mevcut app)` satırının sonucu `skipped`.

- [ ] **Step 5: Başarısızlık halinde ne yapılacağı**

Build kırmızı dönerse hata büyük olasılıkla ops tarafındadır, kodda değil. Log'dan ayırt et:

| Log sinyali | Anlamı | Çözüm |
|---|---|---|
| `Must configure credentials` / imza hatası | EAS'ta iOS dağıtım sertifikası/profili yok | `eas credentials` ile prod credential'ları kur (Apple hesabı gerekir) |
| `project not found` / proje uyuşmazlığı | `app.json` `projectId` bu EAS hesabında yok | expo.dev'den doğru projeyi teyit et (spec §3) |
| `Authentication failed` | `EXPO_TOKEN` süresi dolmuş/geçersiz | expo.dev'den yeni access token üret, repo secret'ını güncelle |

Bunlar **kod değişikliği gerektirmez**; planın kapsamı dışındadır ve kullanıcıya raporlanır.

- [ ] **Step 6: Kaydet**

Commit yok. Bu task'ın çıktısı bir doğrulama sonucudur; sonucu (başarılı/başarısız + log sinyali) raporla.

---

## Tamamlandıktan sonra (bu planın dışında)

1. **Gerçek yayın** — prod API canlı olunca: `app.json` `version` 1.0.0 → 1.0.1, `main` → `master` merge, hat kendiliğinden build + submit eder.
2. **Android** — spec §7 sırası: Play Console app → service account → Firebase çift-client `google-services.json` → workflow'a `--platform android` geri.
3. **AASA + `assetlinks.json`** — her iki domainde 404; universal link'ler bunlar yayınlanana kadar çalışmaz.
