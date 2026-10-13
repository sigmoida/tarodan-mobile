/**
 * Yayın hattı sözleşmesi (docs/RELEASE.md):
 *   development push → CI → fingerprint → staging OTA ya da build (otomatik)
 *   master merge     → CI → development'tan: store build (sürüm artmalı) ·
 *                      hotfix/*'tan: fingerprint → onaylı production OTA ya da store build
 *   master PR'ı      → "Master source guard" (yalnız development / hotfix/*)
 *   hotfix merge     → master → development geri birleştirme PR'ı
 *   Android          → tüm build/submit job'ları vars.ANDROID_RELEASE_ENABLED'a bağlı
 *
 * Workflow'lar YAML olarak parse edilir (`yaml`, metro-config üzerinden zaten
 * kurulu — yeni bağımlılık değil); yorum satırlarındaki kelimeler testleri
 * yanıltmaz.
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

type Step = { id?: string; name?: string; uses?: string; run?: string; if?: string; env?: Record<string, string> };
type Job = {
  name?: string;
  needs?: string | string[];
  if?: string;
  uses?: string;
  environment?: string | { name: string };
  concurrency?: { group: string; 'cancel-in-progress'?: boolean };
  permissions?: Record<string, string>;
  steps?: Step[];
};
type Workflow = {
  on: Record<string, unknown>;
  concurrency?: unknown;
  permissions?: Record<string, string>;
  jobs: Record<string, Job>;
};

const wf = (rel: string) => parse(read(rel)) as Workflow;
const staging = wf('.github/workflows/mobile-staging.yml');
const production = wf('.github/workflows/mobile-production.yml');
const ci = wf('.github/workflows/ci.yml');
const masterFlow = wf('.github/workflows/master-flow.yml');
const simulator = wf('.github/workflows/mobile-build.yml');

const needsOf = (job: Job) => ([] as string[]).concat(job.needs ?? []);
const runs = (job: Job) => (job.steps ?? []).map((s) => s.run ?? '').join('\n');
const envName = (job: Job) =>
  typeof job.environment === 'string' ? job.environment : job.environment?.name;

describe('CI kapısı', () => {
  it('ci.yml yeniden kullanılabilir ve push\'ta ayrıca koşmaz (çift CI yok)', () => {
    expect(ci.on).toHaveProperty('workflow_call');
    expect(ci.on).toHaveProperty('pull_request');
    expect(ci.on).not.toHaveProperty('push');
  });

  it.each([
    ['staging', staging],
    ['production', production],
  ])('%s: CI çağrılır ve plan ona bağlıdır', (_n, w) => {
    expect(w.jobs.ci.uses).toBe('./.github/workflows/ci.yml');
    expect(needsOf(w.jobs.plan)).toContain('ci');
    for (const id of ['ota', 'build-ios', 'build-android']) {
      expect([id, needsOf(w.jobs[id])]).toEqual([id, expect.arrayContaining(['plan'])]);
    }
  });
});

describe('tetikleyiciler', () => {
  it('staging: development push + elle tetikleme (mode/platform)', () => {
    expect(staging.on.push).toMatchObject({ branches: ['development'] });
    const inputs = (staging.on.workflow_dispatch as { inputs: Record<string, { options: string[] }> })
      .inputs;
    expect(inputs.mode.options).toEqual(expect.arrayContaining(['auto', 'ota', 'build', 'apk']));
    expect(inputs.platform.options).toEqual(['all', 'ios', 'android']);
  });

  it('production: master push + elle tetikleme', () => {
    expect(production.on.push).toMatchObject({ branches: ['master'] });
    expect(production.on).toHaveProperty('workflow_dispatch');
  });

  it('production: yalnız test/CI/belge değiştiren merge koşmaz (sürüm kuralı onları kırmızı yapmasın)', () => {
    const ignored = (production.on.push as { 'paths-ignore': string[] })['paths-ignore'];
    expect(ignored).toEqual(
      expect.arrayContaining(['docs/**', '.github/**', 'scripts/ci/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.tsx']),
    );
    // Uygulama kodu, config ve native girdiler asla yok sayılmaz.
    for (const p of ignored) expect([p, /^(src|app|plugins|assets)\b|app\.json|eas\.json|package\.json/.test(p)]).toEqual([p, false]);
  });

  it('hiçbir yayın workflow\'u zamanlanmış (cron) koşmaz', () => {
    for (const w of [staging, production, simulator]) {
      expect(w.on).not.toHaveProperty('schedule');
    }
  });

  it('simulator build workflow yalnız elle tetiklenir', () => {
    expect(Object.keys(simulator.on)).toEqual(['workflow_dispatch']);
  });
});

// Yorum satırları hariç: açıklamalar yasaklı kalıpları anabilir.
const shCode = () =>
  read('scripts/ci/release.sh')
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');

describe('native/JS kararı fingerprint ile', () => {
  it.each([
    ['staging', staging],
    ['production', production],
  ])('%s: plan kararı release.sh plan\'a devreder', (n, w) => {
    expect(runs(w.jobs.plan)).toContain(`scripts/ci/release.sh plan ${n}`);
  });

  it('release.sh plan fingerprint hesaplar ve EAS build\'lerini sorgular', () => {
    const sh = shCode();
    expect(sh).toContain('fingerprint "$BUILD_PROFILE" "$p"');
  });

  it('eski native_re dosya-listesi sınıflandırması kalmadı', () => {
    for (const w of [staging, production]) {
      const all = Object.values(w.jobs).map(runs).join('\n');
      expect(all).not.toContain('native_re');
      expect(all).not.toContain('git diff --name-only');
    }
  });

  it('release.sh expo-updates fingerprint:generate\'i --platform ile çağırır', () => {
    const sh = shCode();
    expect(sh).toContain('npx expo-updates fingerprint:generate --platform "$platform"');
    expect(sh).toMatch(/build:list[\s\S]*--runtime-version/);
  });

  it('submit --latest değil, build id ile yapılır', () => {
    const sh = shCode();
    expect(sh).toContain('--id "$id"');
    expect(sh).not.toMatch(/eas submit[^\n]*--latest/);
  });
});

describe('DRY: karar ve yeniden kontrol tek kopya', () => {
  it.each([
    ['staging', staging],
    ['production', production],
  ])('%s: workflow\'da karar döngüsü ya da find-build kopyası yok', (_n, w) => {
    const all = Object.values(w.jobs).map(runs).join('\n');
    expect(all).not.toMatch(/for p in ios android/);
    expect(all).not.toContain('find-build');
    expect(all).not.toContain('last-store-version');
  });

  it.each([
    ['staging', 'ios', staging],
    ['staging', 'android', staging],
    ['production', 'ios', production],
    ['production', 'android', production],
  ])('%s build-%s: kilit sonrası kontrol release.sh recheck ile', (n, p, w) => {
    const job = w.jobs[`build-${p}`];
    expect(runs(job)).toContain(`scripts/ci/release.sh recheck ${p} ${n}`);
    const buildStep = job.steps!.find((s) => (s.run ?? '').includes('build-submit'));
    expect(buildStep?.if).toBe("steps.recheck.outputs.action == 'build'");
  });
});

describe('kota koruması', () => {
  it('staging plan ve recheck günlük sınırı vars.STAGING_MAX_BUILDS_PER_DAY\'den alır (varsayılan 2)', () => {
    const expr = "${{ vars.STAGING_MAX_BUILDS_PER_DAY || '2' }}";
    const plan = staging.jobs.plan.steps!.find((s) => s.id === 'decide' || (s.run ?? '').includes('release.sh plan'));
    expect(plan?.env?.MAX_BUILDS_PER_DAY).toBe(expr);
    for (const id of ['build-ios', 'build-android']) {
      const recheck = staging.jobs[id].steps!.find((s) => (s.run ?? '').includes('recheck'));
      expect([id, recheck?.env?.MAX_BUILDS_PER_DAY]).toEqual([id, expr]);
    }
  });

  it.each([
    ['staging', staging],
    ['production', production],
  ])('%s: store build\'leri CI fingerprint\'ini FP ile build-submit\'e verir', (_n, w) => {
    for (const p of ['ios', 'android']) {
      const step = w.jobs[`build-${p}`].steps!.find((s) => (s.run ?? '').includes('build-submit'));
      expect([p, step?.env?.FP]).toEqual([p, `\${{ needs.plan.outputs.${p}_fp }}`]);
    }
  });
});

describe('staging', () => {
  it('iOS build staging profiliyle alınıp staging submit profiliyle gönderilir', () => {
    expect(runs(staging.jobs['build-ios'])).toContain('build-submit ios staging staging');
  });

  it('Android Play build/submit staging profiliyle (AAB → internal)', () => {
    expect(runs(staging.jobs['build-android'])).toContain('build-submit android staging staging');
  });

  it('ad-hoc preview APK yalnız elle ve submit\'siz', () => {
    const apk = staging.jobs.apk;
    expect(apk.if).toContain("github.event_name == 'workflow_dispatch'");
    expect(runs(apk)).toContain('build-submit android preview -');
  });

  it('OTA staging dalına, preview env\'iyle yayınlanır', () => {
    expect(runs(staging.jobs.ota)).toContain('publish-ota staging "$OTA_PLATFORM" preview');
  });

  it('derlenen build\'in runtime\'ına OTA, build bittikten SONRA yayınlanır (await-binary)', () => {
    const steps = staging.jobs.ota.steps!;
    const wait = steps.findIndex((s) => (s.run ?? '').includes('release.sh await-binary "$OTA_PLATFORM" staging "$FP"'));
    const publish = steps.findIndex((s) => (s.run ?? '').includes('publish-ota'));
    expect(wait).toBeGreaterThan(-1);
    expect(wait).toBeLessThan(publish);
    expect(steps[wait].if).toBe('${{ matrix.await }}');
    expect(steps[wait].env?.FP).toBe('${{ matrix.fp }}');
    const androidEnabled = "${{ vars.ANDROID_RELEASE_ENABLED == 'true' }}";
    expect(steps[wait].env?.ANDROID_ENABLED).toBe(androidEnabled);
    for (const p of ['ios', 'android']) {
      const bs = staging.jobs[`build-${p}`].steps!;
      const w = bs.findIndex((s) => s.run === `scripts/ci/release.sh await-binary ${p} staging "$FP"`);
      const o = bs.findIndex((s) => (s.run ?? '').includes(`publish-ota staging ${p} preview`));
      expect([p, w > -1 && w < o]).toEqual([p, true]);
      expect(bs[w].if).toBe("steps.recheck.outputs.action == 'ota' && steps.recheck.outputs.await == 'true'");
      expect(bs[w].env?.FP).toBe(`\${{ needs.plan.outputs.${p}_fp }}`);
      expect(bs[w].env?.ANDROID_ENABLED).toBe(androidEnabled);
    }
  });
});

describe('production', () => {
  it('production OTA `environment: production` onayına bağlı', () => {
    expect(envName(production.jobs.ota)).toBe('production');
    expect(runs(production.jobs.ota)).toContain('publish-ota production "$OTA_PLATFORM" production');
  });

  it('store build job\'ları onaysız production-build environment\'ında (onay yalnız OTA için)', () => {
    expect(envName(production.jobs['build-ios'])).toBe('production-build');
    expect(envName(production.jobs['build-android'])).toBe('production-build');
  });

  it('iOS production build + submit production profiliyle', () => {
    expect(runs(production.jobs['build-ios'])).toContain('build-submit ios production production');
  });

  it('sürüm/hotfix ayrımı: merge edilen PR\'ın dalı plan\'a SOURCE_REF olarak gider', () => {
    const steps = production.jobs.plan.steps!;
    const source = steps.find((s) => s.id === 'source');
    expect(source?.if).toContain("github.event_name == 'push'");
    // PR, merge commit'iyle eşleşerek ve yalnız bu depodan bulunur.
    expect(source?.run).toContain('repos/$REPO/commits/$SHA/pulls');
    expect(source?.run).toContain('pulls?state=closed&base=master');
    expect(source?.run).toContain('.merge_commit_sha == env.SHA');
    expect(source?.run).toContain('.base.ref == "master"');
    expect(source?.run).toContain('.head.repo.full_name == env.REPO');
    // Okuma hatası sessizce yutulmaz (uyarı), ama sürüm sayılır (güvenli taraf).
    expect(source?.run).toContain('::warning::');
    // PR'dan gelen hiçbir değer run'a ${{ }} ile enjekte edilmez.
    expect(source?.run).not.toContain('${{');
    expect(source?.env?.GH_TOKEN).toBe('${{ github.token }}');
    const decide = steps.find((s) => s.id === 'decide');
    expect(decide?.env?.SOURCE_REF).toBe('${{ steps.source.outputs.ref }}');
    expect(steps.indexOf(source!)).toBeLessThan(steps.indexOf(decide!));
    expect(production.jobs.plan.permissions).toEqual({ contents: 'read', 'pull-requests': 'read' });
  });

  it('yayın sonrası: etiket + GitHub Release + development sonraki yama + staging', () => {
    const job = production.jobs['release-bookkeeping'];
    expect(needsOf(job)).toEqual(expect.arrayContaining(['plan', 'build-ios', 'build-android']));
    // Yalnız bir store build'i başarıyla gönderildiyse; takılan koşu ya da yalnız OTA tetiklemez.
    expect(job.if).toContain("needs.plan.outputs.blocked == ''");
    expect(job.if).toContain("needs.build-ios.result == 'success' || needs.build-android.result == 'success'");
    expect(job.if).toContain("needs.build-ios.result != 'failure'");
    expect(job.if).toContain("needs.build-android.result != 'failure'");
    expect(job.permissions).toEqual({ contents: 'write', actions: 'write' });
    expect(envName(job)).toBeUndefined();
    expect(JSON.stringify(job)).not.toContain('EXPO_TOKEN');
    const all = runs(job);
    expect(all).toContain('git tag -a "$tag" "$SHA"');
    expect(all).toContain('gh release create "$tag" --verify-tag');
    expect(all).toContain('--generate-notes');
    // Sürüm hesabı tek yerde (release.sh), master'daki kopyayla.
    expect(all).toContain('"$RUNNER_TEMP/release.sh" bump-version "$RELEASED" app.json');
    expect(all).toContain('git push -q origin HEAD:development');
    const start = job.steps!.find((s) => (s.run ?? '').includes('gh workflow run mobile-staging.yml --ref development'));
    expect(start?.if).toBe("steps.bump.outputs.bumped == 'true'");
    // Olay verisi run'a enjekte edilmez.
    for (const s of job.steps!) expect([s.name, (s.run ?? '').includes('${{')]).toEqual([s.name, false]);
  });

  it('staging plan\'ı SOURCE_REF almaz (kural yalnız production\'da)', () => {
    const decide = staging.jobs.plan.steps!.find((s) => s.id === 'decide');
    expect(decide?.env?.SOURCE_REF).toBeUndefined();
  });

  it('VERSION-GATE: native değişikliğinde expo.version son production build\'inden büyük olmalı', () => {
    const sh = shCode();
    expect(sh).toContain('expo.version');
    expect(sh).toContain('last_store_version "$p" "$BUILD_PROFILE"');
    expect(sh).toContain('version_gt "$version" "$last"');
  });

  it.each([
    ['staging', staging],
    ['production', production],
  ])('%s: engellenen platform diğerini durdurmaz, koşu sonda kırmızı', (_n, w) => {
    const fail = w.jobs.plan.steps!.find((s) => s.if === "steps.decide.outputs.blocked != ''");
    expect(fail?.run).toContain('exit 1');
    const downstream = Object.entries(w.jobs).filter(([id]) => !['ci', 'plan'].includes(id));
    for (const [id, job] of downstream) {
      expect([id, job.if]).toEqual([id, expect.stringContaining('!cancelled()')]);
      expect([id, job.if]).toEqual([id, expect.stringContaining("needs.plan.outputs.decided == 'true'")]);
    }
  });

  it.each([
    ['production', production],
    ['staging', staging],
  ])('%s: ref koruması EAS kurulumundan ÖNCE release.sh guard-ref ile', (n, w) => {
    const steps = w.jobs.plan.steps!;
    const guard = steps.findIndex((s) => (s.run ?? '').includes(`release.sh guard-ref ${n}`));
    const setup = steps.findIndex((s) => s.uses === './.github/actions/setup-eas');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(setup);
    expect(steps[guard].env?.REF).toBe('${{ github.ref }}');
  });

  it('staging APK dalları vars.STAGING_APK_BRANCHES\'ten (varsayılan yalnız development)', () => {
    const step = staging.jobs.plan.steps!.find((s) => (s.run ?? '').includes('guard-ref'));
    expect(step?.env?.APK_BRANCHES).toBe("${{ vars.STAGING_APK_BRANCHES || 'development' }}");
  });
});

describe('Android paket doğrulaması', () => {
  it.each([
    ['staging', staging, 'com.tarodan.app.staging'],
    ['production', production, 'com.tarodan.app'],
  ])('%s build-android: paket build\'den önce ve gönderimden önce doğrulanır', (n, w, pkg) => {
    const steps = w.jobs['build-android'].steps!;
    const assert = steps.findIndex((s) => s.run === `scripts/ci/release.sh assert-app-id android ${n} ${pkg}`);
    const buildIdx = steps.findIndex((s) => (s.run ?? '').includes('build-submit'));
    expect(assert).toBeGreaterThan(-1);
    expect(assert).toBeLessThan(buildIdx);
    expect(steps[assert].if).toBe("steps.recheck.outputs.action == 'build'");
    expect(steps[buildIdx].run).toBe(`scripts/ci/release.sh build-submit android ${n} ${n} ${pkg}`);
  });
});

describe('Android hazır ama değişkenle kapalı', () => {
  it.each([
    ['staging', staging],
    ['production', production],
  ])('%s: build-android vars.ANDROID_RELEASE_ENABLED == \'true\' ister', (_n, w) => {
    expect(w.jobs['build-android'].if).toContain("vars.ANDROID_RELEASE_ENABLED == 'true'");
  });

  it('production Android submit production profiliyle (track eas.json\'da internal)', () => {
    expect(runs(production.jobs['build-android'])).toContain('build-submit android production production');
  });
});

describe('concurrency', () => {
  it.each([
    ['staging', staging],
    ['production', production],
  ])('%s: bekleyen OTA başka runtime/platform push\'uyla iptal edilmez, build asla', (n, w) => {
    expect(w.concurrency).toBeUndefined();
    const ota = w.jobs.ota as Job & { strategy?: { matrix?: { include?: string } } };
    expect(ota.strategy?.matrix?.include).toBe('${{ fromJSON(needs.plan.outputs.ota_matrix) }}');
    expect(ota.concurrency).toEqual({
      group: `mobile-${n}-ota-\${{ matrix.platform }}-\${{ matrix.fp }}`,
      'cancel-in-progress': false,
    });
    expect(runs(ota)).toContain('"$OTA_PLATFORM"');
    expect(ota.steps!.find((s) => (s.run ?? '').includes('publish-ota'))?.env?.OTA_PLATFORM).toBe('${{ matrix.platform }}');
    expect(w.jobs.plan.concurrency?.['cancel-in-progress']).toBe(false);
    for (const id of ['build-ios', 'build-android']) {
      expect([id, w.jobs[id].concurrency?.['cancel-in-progress']]).toEqual([id, false]);
    }
  });

  it('CI yalnız PR\'da eski koşuyu iptal eder (yayın koşusunun OTA\'sı düşmez)', () => {
    expect((ci.concurrency as { 'cancel-in-progress': unknown })['cancel-in-progress']).toBe(
      "${{ github.event_name == 'pull_request' }}",
    );
  });

  it('EXPO_TOKEN guard korunur', () => {
    for (const w of [staging, production]) {
      expect(w.jobs.plan.steps!.some((s) => s.env?.HAS_TOKEN?.includes('secrets.EXPO_TOKEN'))).toBe(true);
    }
  });
});

describe('EXPO_TOKEN environment\'larda (repo düzeyinde değil)', () => {
  const all = {
    'mobile-staging.yml': staging,
    'mobile-production.yml': production,
    'mobile-build.yml': simulator,
    'master-flow.yml': masterFlow,
    'ci.yml': ci,
  };

  it('token isteyen HER job bir environment\'a bağlı', () => {
    for (const [file, w] of Object.entries(all)) {
      expect([file, JSON.stringify((w as { env?: unknown }).env ?? {})]).not.toEqual([file, expect.stringContaining('EXPO_TOKEN')]);
      for (const [id, job] of Object.entries(w.jobs)) {
        if (JSON.stringify(job).includes('secrets.EXPO_TOKEN')) {
          expect([file, id, envName(job)]).toEqual([file, id, expect.any(String)]);
        }
      }
    }
  });

  it.each([
    ['staging', 'plan', 'staging'],
    ['staging', 'ota', 'staging'],
    ['staging', 'build-ios', 'staging'],
    ['staging', 'build-android', 'staging'],
    ['staging', 'apk', 'staging'],
    ['production', 'plan', 'production-build'],
    ['production', 'build-ios', 'production-build'],
    ['production', 'build-android', 'production-build'],
    ['production', 'ota', 'production'],
    ['simulator', 'build', 'staging'],
  ])('%s/%s → %s', (w, id, env) => {
    const wf = { staging, production, simulator }[w]!;
    expect(envName(wf.jobs[id])).toBe(env);
  });

  it('onaylı `production` environment\'ı yalnız OTA job\'unda', () => {
    for (const w of [staging, production, simulator]) {
      for (const [id, job] of Object.entries(w.jobs)) {
        if (envName(job) === 'production') expect(id).toBe('ota');
      }
    }
  });
});

describe('master akışı', () => {
  it('"Master source guard" master PR\'larında koşar, path filtresi yok', () => {
    const pr = masterFlow.on.pull_request_target as { branches: string[]; paths?: unknown; 'paths-ignore'?: unknown };
    expect(pr.branches).toEqual(['master']);
    expect(pr.paths).toBeUndefined();
    expect(pr['paths-ignore']).toBeUndefined();
    const guard = masterFlow.jobs['source-guard'];
    expect(guard.name).toBe('Master source guard');
    expect(runs(guard)).toMatch(/development\|hotfix\/\*\)/);
  });

  it('guard PR\'ın değiştiremeyeceği tetikleyicide (pull_request_target) ve güvenli', () => {
    // pull_request workflow dosyasını PR head'inden okur → PR guard'ı yeşile çevirebilirdi.
    expect(masterFlow.on).not.toHaveProperty('pull_request');
    const guard = masterFlow.jobs['source-guard'];
    // PR kodu checkout edilmez.
    expect(guard.steps!.some((s) => (s.uses ?? '').startsWith('actions/checkout'))).toBe(false);
    // Dal adı yalnız env'den; run içinde ifade yok.
    for (const job of Object.values(masterFlow.jobs)) {
      expect(runs(job)).not.toContain('${{');
    }
    const step = guard.steps!.find((s) => s.run);
    expect(step?.env?.HEAD_REF).toBe('${{ github.event.pull_request.head.ref }}');
    expect(step?.run).toContain('"$HEAD_REF"');
  });

  it('back-merge yalnız aynı depodan gelen hotfix\'te ve master\'ı checkout eder', () => {
    const job = masterFlow.jobs['hotfix-backmerge'];
    expect(job.if).toContain('github.event.pull_request.head.repo.full_name == github.repository');
    const co = job.steps!.find((s) => (s.uses ?? '').startsWith('actions/checkout')) as Step & { with?: { ref?: string } };
    expect(co.with?.ref).toBe('master');
  });

  it('hotfix merge\'ünde development\'a geri birleştirme PR\'ı açılır', () => {
    const job = masterFlow.jobs['hotfix-backmerge'];
    expect(job.if).toContain('github.event.pull_request.merged == true');
    expect(job.if).toContain("startsWith(github.event.pull_request.head.ref, 'hotfix/')");
    expect(job.permissions).toEqual({ contents: 'write', 'pull-requests': 'write' });
    expect(runs(job)).toContain('gh pr create');
    expect(runs(job)).toContain('--base development');
  });

  it('workflow düzeyinde yetkiler salt-okunur', () => {
    for (const w of [staging, production, masterFlow]) {
      expect(w.permissions).toEqual({ contents: 'read' });
    }
  });
});
