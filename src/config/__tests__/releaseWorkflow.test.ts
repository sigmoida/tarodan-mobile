/**
 * Yayın hattı sözleşmesi (docs/RELEASE.md):
 *   development push → CI → fingerprint → staging OTA ya da build (otomatik)
 *   master merge     → CI → fingerprint → onaylı production OTA ya da store build
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
});

describe('production', () => {
  it('production OTA `environment: production` onayına bağlı', () => {
    expect(envName(production.jobs.ota)).toBe('production');
    expect(runs(production.jobs.ota)).toContain('publish-ota production "$OTA_PLATFORM" production');
  });

  it('store build job\'ları onay environment\'ı istemez (onay yalnız OTA için)', () => {
    expect(envName(production.jobs['build-ios'])).toBeUndefined();
  });

  it('iOS production build + submit production profiliyle', () => {
    expect(runs(production.jobs['build-ios'])).toContain('build-submit ios production production');
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

describe('master akışı', () => {
  it('"Master source guard" master PR\'larında koşar, path filtresi yok', () => {
    const pr = masterFlow.on.pull_request as { branches: string[]; paths?: unknown; 'paths-ignore'?: unknown };
    expect(pr.branches).toEqual(['master']);
    expect(pr.paths).toBeUndefined();
    expect(pr['paths-ignore']).toBeUndefined();
    const guard = masterFlow.jobs['source-guard'];
    expect(guard.name).toBe('Master source guard');
    expect(runs(guard)).toMatch(/development\|hotfix\/\*\)/);
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
