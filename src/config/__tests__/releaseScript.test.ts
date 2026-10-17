/**
 * scripts/ci/release.sh senaryo testleri — sahte `eas` ve `npx` ile
 * (scripts/ci/__fakes__). Workflow'lardaki karar mantığı (plan / recheck /
 * build-submit / publish-ota) bu script'te durduğu için davranışı burada,
 * EAS'e dokunmadan doğruluyoruz. Sahte eas'in JSON şekli eas-cli 24.x `--json`
 * çıktısıyla aynıdır (bkz. __fakes__/eas başı).
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parse } from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');
const SCRIPT = path.join(ROOT, 'scripts/ci/release.sh');
const FAKES = path.join(ROOT, 'scripts/ci/__fakes__');

type Build = Record<string, unknown>;
type Submission = Record<string, unknown>;

type EasJson = { build: Record<string, { channel?: string; env?: Record<string, string> }> } & Record<string, unknown>;
const realEasJson = (): EasJson => JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));

const TODAY = new Date().toISOString().slice(0, 10);
/** Senaryolardaki app.json sürümü (build'lerin varsayılan appVersion'ı da bu). */
const TEST_VERSION = '1.0.5';

/** eas-cli 24.x BuildFragment şeklinde bir build. */
const build = (o: {
  id: string;
  platform?: 'IOS' | 'ANDROID';
  profile?: string;
  runtime?: string;
  status?: string;
  appVersion?: string;
  channel?: string;
  appIdentifier?: string;
  createdAt?: string;
  message?: string;
  commit?: string;
}): Build => {
  const platform = o.platform ?? 'IOS';
  const profile = o.profile ?? 'staging';
  const env = profile === 'production' ? 'production' : 'preview';
  const runtime = o.runtime ?? `fp-${platform.toLowerCase()}-${env}`;
  return {
    id: o.id,
    status: o.status ?? 'FINISHED',
    platform,
    buildProfile: profile,
    distribution: profile === 'preview' ? 'INTERNAL' : 'STORE',
    appVersion: o.appVersion ?? TEST_VERSION,
    appIdentifier: o.appIdentifier ?? (env === 'production' ? 'com.tarodan.app' : 'com.tarodan.app.staging'),
    runtime: { id: `rt-${runtime}`, version: runtime },
    fingerprint: { id: `f-${runtime}`, hash: runtime },
    updateChannel: { id: 'c', name: o.channel ?? (profile === 'production' ? 'production' : 'staging') },
    createdAt: o.createdAt ?? `${TODAY}T00:00:00.000Z`,
    ...(o.message ? { message: o.message } : {}),
    ...(o.commit ? { gitCommitHash: o.commit } : {}),
  };
};

const submission = (buildId: string, status = 'FINISHED', platform: 'IOS' | 'ANDROID' = 'IOS'): Submission => ({
  id: `sub-${buildId}-${status}`,
  status,
  platform,
  submittedBuild: { id: buildId },
});

type RunOpts = {
  env?: Record<string, string>;
  /** eas.json'u değiştirerek koş. */
  easJson?: (eas: EasJson) => EasJson | string;
  builds?: Build[];
  submissions?: Submission[];
  buildResult?: unknown;
  /** Ardışık sorgular için build listeleri (FAKE_BUILDS_SEQ): her biri bir sorguya. */
  buildsSeq?: Build[][];
  /** Koşudan sonra okunacak dosyalar (geçici köke göre). */
  readFiles?: string[];
  /** Sahte eas'in okuyacağı ek dosyalar ($FAKE_DIR'e yazılır; ör. `eas-env-production-account.txt`). */
  fakeFiles?: Record<string, string>;
};

function run(args: string[], opts: RunOpts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-sh-'));
  const outFile = path.join(dir, 'github_output');
  const summaryFile = path.join(dir, 'summary');
  fs.writeFileSync(path.join(dir, 'log'), '');
  fs.writeFileSync(outFile, '');
  if (opts.builds) fs.writeFileSync(path.join(dir, 'builds.json'), JSON.stringify(opts.builds));
  if (opts.submissions) fs.writeFileSync(path.join(dir, 'submissions.json'), JSON.stringify(opts.submissions));
  if (opts.buildResult) fs.writeFileSync(path.join(dir, 'build-result.json'), JSON.stringify(opts.buildResult));
  for (const [name, content] of Object.entries(opts.fakeFiles ?? {})) fs.writeFileSync(path.join(dir, name), content);
  const seqEnv: Record<string, string> = {};
  if (opts.buildsSeq) {
    // 'FAIL' (dizi yerine) o sorguyu geçici EAS hatasıyla düşürür.
    const names = opts.buildsSeq.map((b, i) => {
      if ((b as unknown) === 'FAIL') return 'FAIL';
      fs.writeFileSync(path.join(dir, `seq-${i}.json`), JSON.stringify(b));
      return `seq-${i}.json`;
    });
    seqEnv.FAKE_BUILDS_SEQ = names.join(',');
  }

  // Runner'dan sızabilecek değişkenleri temizle; testler kendi env'ini verir.
  const base = { ...process.env };
  for (const k of Object.keys(base)) {
    if (k.startsWith('EXPO_PUBLIC_') || k.startsWith('GITHUB_')) delete base[k];
  }
  for (const k of ['MODE', 'PLATFORM', 'ANDROID_ENABLED', 'COMMIT_MSG', 'SHA', 'FP', 'SOURCE_REF', 'SENTRY_AUTH_TOKEN']) {
    delete base[k];
  }

  // Script HER ZAMAN geçici bir kök dizinden koşar: build-submit eas-build.json'u
  // kökte yazar; testler repoya asla dosya bırakmamalı.
  const root = path.join(dir, 'root');
  fs.mkdirSync(path.join(root, 'scripts/ci'), { recursive: true });
  const script = path.join(root, 'scripts/ci/release.sh');
  fs.copyFileSync(SCRIPT, script);
  // Senaryolar sabit bir sürümle (TEST_VERSION) koşar: gerçek app.json'un sürümü
  // her yayında değişir, testler ona bağlı kalmamalı.
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  appJson.expo.version = TEST_VERSION;
  fs.writeFileSync(path.join(root, 'app.json'), `${JSON.stringify(appJson, null, 2)}\n`);
  const eas = opts.easJson ? opts.easJson(realEasJson()) : realEasJson();
  fs.writeFileSync(path.join(root, 'eas.json'), typeof eas === 'string' ? eas : JSON.stringify(eas));

  const res = spawnSync('bash', [script, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...base,
      PATH: `${FAKES}:${process.env.PATH}`,
      FAKE_DIR: dir,
      GITHUB_OUTPUT: outFile,
      GITHUB_STEP_SUMMARY: summaryFile,
      ...seqEnv,
      ...opts.env,
    },
    maxBuffer: 16 * 1024 * 1024,
  });
  // Süreç başlatılamadı / tampon taştı: boş çıktıyla yanıltıcı bir assertion yerine
  // asıl hatayı göster (CI'da bir kez nedeni görünmeyen "undefined" çıktı).
  if (res.error) throw res.error;
  const outputs: Record<string, string> = {};
  for (const line of fs.readFileSync(outFile, 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) outputs[line.slice(0, i)] = line.slice(i + 1);
  }
  const log = fs.readFileSync(path.join(dir, 'log'), 'utf8').split('\n').filter(Boolean);
  const files: Record<string, string> = {};
  for (const f of opts.readFiles ?? []) files[f] = fs.readFileSync(path.join(root, f), 'utf8');
  const result = {
    status: res.status,
    stdout: res.stdout,
    stderr: res.stderr,
    all: `${res.stdout}\n${res.stderr}`,
    outputs,
    log,
    summary: fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, 'utf8') : '',
    easCalls: (cmd: string) => log.filter((l) => l.startsWith(`eas ${cmd} `)),
    files,
  };
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}

const plan = (env: 'staging' | 'production', opts: RunOpts = {}) =>
  run(['plan', env], { ...opts, env: { COMMIT_MSG: 'feat: x\n\nbody', SHA: 'abcdef1234', ...opts.env } });

// Staging/production için "kullanılabilir binary" (bitmiş + gönderilmiş).
const shipped = (id: string, o: Partial<Parameters<typeof build>[0]> = {}) => {
  const b = build({ id, ...o });
  return { b, s: submission(id, 'FINISHED', b.platform as 'IOS' | 'ANDROID') };
};

describe('release.sh plan — karar döngüsü tek yerde (DRY)', () => {
  it('staging: iOS binary var → OTA; Android değişken kapalı ve build yok → skip', () => {
    const ios = shipped('ios-1');
    const r = plan('staging', { builds: [ios.b], submissions: [ios.s] });
    expect(r.status).toBe(0);
    expect(r.outputs).toMatchObject({
      message: 'feat: x',
      apk: 'false',
      ios: 'ota',
      ios_fp: 'fp-ios-preview',
      android: 'skip',
      android_fp: 'fp-android-preview',
    });
  });

  it('fingerprint profilin env\'iyle hesaplanır (staging → preview, production → production)', () => {
    const s = plan('staging', { env: { PLATFORM: 'ios' } });
    expect(s.log.some((l) => l.includes('fingerprint:generate --platform ios | EXPO_PUBLIC_ENVIRONMENT=preview'))).toBe(true);
    const p = plan('production', { env: { PLATFORM: 'ios' } });
    expect(p.log.some((l) => l.includes('fingerprint:generate --platform ios | EXPO_PUBLIC_ENVIRONMENT=production'))).toBe(true);
  });

  it('staging: build yok → build', () => {
    const r = plan('staging', { env: { PLATFORM: 'ios' } });
    expect(r.outputs.ios).toBe('build');
    expect(r.outputs.android).toBe('skip');
  });

  it('staging: mode=apk yalnız APK ister', () => {
    const r = plan('staging', { env: { MODE: 'apk' } });
    expect(r.outputs).toMatchObject({ apk: 'true', ios: 'skip', android: 'skip' });
    expect(r.easCalls('build:list')).toHaveLength(0);
  });

  it('staging: Android kapalıyken preview APK\'ları da binary sayılır', () => {
    const apk = build({ id: 'apk-1', platform: 'ANDROID', profile: 'preview' });
    const r = plan('staging', { env: { PLATFORM: 'android' }, builds: [apk] });
    expect(r.outputs.android).toBe('ota');
  });

  it('staging: iOS preview (ad-hoc) build\'i binary sayılmaz', () => {
    const adhoc = build({ id: 'adhoc-1', profile: 'preview' });
    const r = plan('staging', { env: { PLATFORM: 'ios' }, builds: [adhoc] });
    expect(r.outputs.ios).toBe('build');
  });

  it('production: Android değişken kapalıyken tamamen atlanır', () => {
    const r = plan('production', {
      env: { SOURCE_REF: 'hotfix/x' },
      builds: [build({ id: 'p', profile: 'production' })],
      submissions: [submission('p')],
    });
    expect(r.outputs.android).toBe('skip');
    expect(r.outputs.ios).toBe('ota');
    expect(r.easCalls('build:list').every((l) => l.includes('--platform ios'))).toBe(true);
  });

  it('ota_matrix: OTA\'lık her platform kendi fingerprint\'iyle', () => {
    const ios = shipped('i');
    const and = shipped('a', { platform: 'ANDROID' });
    const r = plan('staging', {
      env: { ANDROID_ENABLED: 'true' },
      builds: [ios.b, and.b],
      submissions: [ios.s, and.s],
    });
    expect(JSON.parse(r.outputs.ota_matrix)).toEqual([
      { platform: 'ios', fp: 'fp-ios-preview' },
      { platform: 'android', fp: 'fp-android-preview' },
    ]);
  });
});

describe('release.sh recheck — build kilidi sonrası tek yerde', () => {
  it('staging: arada binary oluştuysa OTA\'ya döner', () => {
    const ios = shipped('ios-1');
    const r = run(['recheck', 'ios', 'staging'], {
      env: { FP: 'fp-ios-preview' },
      builds: [ios.b],
      submissions: [ios.s],
    });
    expect(r.outputs.action).toBe('ota');
  });

  it('production: arada build oluştuysa onaysız OTA\'ya DÜŞMEZ, atlar', () => {
    const p = shipped('p', { profile: 'production' });
    const r = run(['recheck', 'ios', 'production'], {
      env: { FP: 'fp-ios-production' },
      builds: [p.b],
      submissions: [p.s],
    });
    expect(r.outputs.action).toBe('skip');
    expect(r.all).toContain('::warning::');
  });

  it('build yoksa build; mode=build sorgulamadan build', () => {
    expect(run(['recheck', 'ios', 'staging'], { env: { FP: 'fp-ios-preview' } }).outputs.action).toBe('build');
    const forced = run(['recheck', 'ios', 'staging'], { env: { FP: 'x', MODE: 'build' } });
    expect(forced.outputs.action).toBe('build');
    expect(forced.easCalls('build:list')).toHaveLength(0);
  });

  it('FP boşsa durur', () => {
    expect(run(['recheck', 'ios', 'staging']).status).not.toBe(0);
  });
});

describe('release.sh profil env\'i — hata yutulmaz, zorunlu env doğrulanır', () => {
  const withEnv = (profile: string, patch: Record<string, string | undefined>) => (eas: EasJson) => {
    const env = { ...eas.build[profile].env };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) delete env[k];
      else env[k] = v;
    }
    eas.build[profile] = { ...eas.build[profile], env };
    return eas;
  };
  /** A clean EAS production environment with the Sentry DSN (as the real one must be). */
  const DSN_ENV = { 'eas-env-production-project.txt': 'EXPO_PUBLIC_SENTRY_DSN=https://key@example.invalid/1\n' };
  // By default a ready OTA: the Sentry token is set and the EAS environment has the DSN.
  const ota = (branch: string, profile: string, opts: RunOpts = {}) =>
    run(['publish-ota', branch, 'all', profile, 'msg'], {
      ...opts,
      env: { SENTRY_AUTH_TOKEN: 'test-token', ...opts.env },
      fakeFiles: { ...DSN_ENV, ...opts.fakeFiles },
    });

  it('production OTA is published with the eas.json production env and the production EAS environment', () => {
    const r = ota('production', 'production');
    expect(r.status).toBe(0);
    expect(r.easCalls('update')).toEqual([
      expect.stringContaining(
        '--branch production --platform all --environment production --message msg --non-interactive | EXPO_PUBLIC_ENVIRONMENT=production EXPO_PUBLIC_API_URL=https://tarodan.com.tr/api',
      ),
    ]);
  });

  it('production OTA: EAS variables of the production environment are checked first, then the source maps go to Sentry', () => {
    const r = ota('production', 'production');
    const calls = r.log.map((l) => l.split(' | ')[0]);
    const envList = calls.indexOf('eas env:list production --scope project --format short');
    const update = calls.findIndex((c) => c.startsWith('eas update '));
    const upload = calls.indexOf('npx sentry-expo-upload-sourcemaps dist');
    expect(calls).toContain('eas env:list production --scope account --format short');
    expect(envList).toBeGreaterThan(-1);
    expect(envList).toBeLessThan(update);
    expect(update).toBeLessThan(upload);
  });

  it('production OTA without SENTRY_AUTH_TOKEN is not published', () => {
    const r = ota('production', 'production', { env: { SENTRY_AUTH_TOKEN: '' } });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('SENTRY_AUTH_TOKEN');
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('production OTA without the Sentry DSN in the EAS environment is not published', () => {
    const r = ota('production', 'production', { fakeFiles: { 'eas-env-production-project.txt': '' } });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('EXPO_PUBLIC_SENTRY_DSN');
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('the DSN may also come from the account scope', () => {
    const r = ota('production', 'production', {
      fakeFiles: { 'eas-env-production-project.txt': '', 'eas-env-production-account.txt': 'EXPO_PUBLIC_SENTRY_DSN=https://key@example.invalid/1\n' },
    });
    expect(r.status).toBe(0);
  });

  it('a failed source map upload fails the job (the OTA is already out, so it says so)', () => {
    const r = ota('production', 'production', { env: { FAKE_SENTRY_UPLOAD_FAIL: '1' } });
    expect(r.status).not.toBe(0);
    expect(r.easCalls('update')).toHaveLength(1);
    expect(r.all).toContain('source maps were NOT uploaded');
  });

  it.each([['EXPO_PUBLIC_API_URL'], ['EXPO_PUBLIC_ENVIRONMENT']])(
    'an EAS variable that would override eas.json (%s) stops the OTA (eas update lets EAS win)',
    (key) => {
      const r = ota('production', 'production', {
        fakeFiles: { 'eas-env-production-project.txt': `EXPO_PUBLIC_SENTRY_DSN=https://key@example.invalid/1\n${key}=https://staging.example\n` },
      });
      expect(r.status).not.toBe(0);
      expect(r.all).toContain(key);
      expect(r.easCalls('update')).toHaveLength(0);
    },
  );

  it.each(['project', 'account'])('an unreadable EAS environment (%s scope) stops the OTA', (scope) => {
    const r = ota('production', 'production', { env: { FAKE_EAS_FAIL_ENV_LIST_SCOPE: scope } });
    expect(r.status).not.toBe(0);
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('a Maestro test hook in the EAS environment stops the OTA', () => {
    const r = ota('staging', 'preview', { fakeFiles: { 'eas-env-preview-account.txt': 'EXPO_PUBLIC_MAESTRO=1\n' } });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('EXPO_PUBLIC_MAESTRO');
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('no Sentry org/project for the upload -> nothing is published', () => {
    const r = ota('production', 'production', { env: { FAKE_NO_SENTRY_PLUGIN: '1' } });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('Sentry source map upload would fail');
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('SENTRY_ORG + SENTRY_PROJECT + SENTRY_URL replace the plugin options (all three, as the upload script needs)', () => {
    const env = { FAKE_NO_SENTRY_PLUGIN: '1', SENTRY_ORG: 'org', SENTRY_PROJECT: 'project' };
    expect(ota('production', 'production', { env }).status).not.toBe(0);
    expect(ota('production', 'production', { env: { ...env, SENTRY_URL: 'https://sentry.io/' } }).status).toBe(0);
  });

  it.each([
    ['empty', 'EXPO_PUBLIC_SENTRY_DSN=\n'],
    [
      'secret visibility (eas update cannot read it)',
      "EXPO_PUBLIC_SENTRY_DSN=***** (This is a secret env variable that can only be accessed on EAS builder and can't be read in any UI. Learn more.)\n",
    ],
  ])('a DSN that is %s does not count', (_n, line) => {
    const r = ota('production', 'production', { fakeFiles: { 'eas-env-production-project.txt': line } });
    expect(r.status).not.toBe(0);
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('a sensitive DSN counts (eas update can read it)', () => {
    const line = 'EXPO_PUBLIC_SENTRY_DSN=***** (This is a sensitive env variable. To access it, run command with --include-sensitive flag. Learn more.)\n';
    expect(ota('production', 'production', { fakeFiles: { 'eas-env-production-project.txt': line } }).status).toBe(0);
  });

  it('no source map in the export fails the job (the upload script would exit 0)', () => {
    const r = ota('production', 'production', { env: { FAKE_UPDATE_NO_MAPS: 'all' } });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('source map to dist/');
    expect(r.log.some((l) => l.startsWith('npx sentry-expo-upload-sourcemaps'))).toBe(false);
  });

  it('a test hook that is not at the line start is still caught (fail closed)', () => {
    const r = ota('production', 'production', {
      fakeFiles: { 'eas-env-production-project.txt': 'EXPO_PUBLIC_SENTRY_DSN=https://key@example.invalid/1\n  EXPO_PUBLIC_MAESTRO_PASSWORD=x\n' },
    });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('EXPO_PUBLIC_MAESTRO_PASSWORD');
  });

  it('a DSN leaked from the runner does not count (only eas.json / EAS values do)', () => {
    const r = ota('production', 'production', {
      env: { EXPO_PUBLIC_SENTRY_DSN: 'https://leaked@example.invalid/1' },
      fakeFiles: { 'eas-env-production-project.txt': '' },
    });
    expect(r.status).not.toBe(0);
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('the override check fails closed: a value that mentions a profile key also stops the OTA', () => {
    const r = ota('production', 'production', {
      fakeFiles: { 'eas-env-production-project.txt': 'EXPO_PUBLIC_SENTRY_DSN=https://key@example.invalid/1\nNOTE=see EXPO_PUBLIC_API_URL=x\n' },
    });
    expect(r.status).not.toBe(0);
  });

  it('a hook not in TEST_HOOK_ENV is still caught by its EXPO_PUBLIC_MAESTRO prefix', () => {
    const r = ota('production', 'production', {
      fakeFiles: { 'eas-env-production-project.txt': 'EXPO_PUBLIC_SENTRY_DSN=https://key@example.invalid/1\nEXPO_PUBLIC_MAESTRO_SEED=1\n' },
    });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('EXPO_PUBLIC_MAESTRO_SEED');
  });

  it('a secret DSN in one scope fails even if the other scope has a readable one', () => {
    const secret = "EXPO_PUBLIC_SENTRY_DSN=***** (This is a secret env variable that can only be accessed on EAS builder and can't be read in any UI. Learn more.)\n";
    const r = ota('production', 'production', {
      fakeFiles: { 'eas-env-production-project.txt': secret, 'eas-env-production-account.txt': 'EXPO_PUBLIC_SENTRY_DSN=https://k@example.invalid/1\n' },
    });
    expect(r.status).not.toBe(0);
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('a bare masked DSN without the sensitive marker fails (fail closed if eas-cli rewords)', () => {
    const r = ota('production', 'production', { fakeFiles: { 'eas-env-production-project.txt': 'EXPO_PUBLIC_SENTRY_DSN=*****\n' } });
    expect(r.status).not.toBe(0);
  });

  it('SENTRY_ORG + SENTRY_PROJECT with plugin options that lack them pass, as in the upload script', () => {
    const env = { FAKE_NO_SENTRY_PLUGIN: 'url', SENTRY_ORG: 'org', SENTRY_PROJECT: 'project' };
    expect(ota('production', 'production', { env }).status).toBe(0);
    expect(ota('production', 'production', { env: { FAKE_NO_SENTRY_PLUGIN: 'url' } }).status).not.toBe(0);
  });

  it('a missing map for one of the platforms fails the job', () => {
    const r = ota('production', 'production', { env: { FAKE_UPDATE_NO_MAPS: 'android' } });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('no android source map');
  });

  // mobile-production.yml runs one OTA job per platform (the ota_matrix), so the CI
  // path is `publish-ota production <ios|android>`, never `all`.
  const otaOne = (p: string, env: Record<string, string> = {}) =>
    run(['publish-ota', 'production', p, 'production', 'msg'], {
      env: { SENTRY_AUTH_TOKEN: 'test-token', ...env },
      fakeFiles: DSN_ENV,
    });

  it.each(['ios', 'android'])('a single-platform production OTA (%s) publishes and uploads only that platform', (p) => {
    const r = otaOne(p);
    expect(r.status).toBe(0);
    expect(r.easCalls('update')).toEqual([
      expect.stringContaining(`--branch production --platform ${p} --environment production --message msg`),
    ]);
    expect(r.log.filter((l) => l.startsWith('npx sentry-expo-upload-sourcemaps dist'))).toHaveLength(1);
  });

  it.each([
    ['ios', 'ios'],
    ['android', 'android'],
    ['all', 'ios'],
  ])('a %s map without a debugId fails after publishing, before any upload, and says not to re-run', (missing, p) => {
    // Sentry matches a bundle to its map by debugId; a map without one never resolves.
    const r = otaOne(p, { FAKE_UPDATE_NO_DEBUGID: missing });
    expect(r.status).not.toBe(0);
    expect(r.easCalls('update')).toHaveLength(1);
    expect(r.all).toContain(`::error::The OTA IS published, but its ${p} source map`);
    expect(r.all).toMatch(/::error::\S+index\.hbc\.map has no debugId\./);
    expect(r.all).not.toContain('is not a readable source map');
    expect(r.all).toContain('has no readable debugId');
    expect(r.all).toContain('Do NOT re-run this job');
    expect(r.log.some((l) => l.startsWith('npx sentry-expo-upload-sourcemaps'))).toBe(false);
  });

  it('an unreadable map fails with its own cause, not only "no debugId"', () => {
    const r = otaOne('ios', { FAKE_UPDATE_BAD_MAP: 'ios' });
    expect(r.status).not.toBe(0);
    expect(r.all).toMatch(/::error::\S+index\.hbc\.map is not a readable source map \(/);
    expect(r.all).toContain('has no readable debugId (cause above)');
    expect(r.log.some((l) => l.startsWith('npx sentry-expo-upload-sourcemaps'))).toBe(false);
  });

  it('a map with debug_id counts (Sentry accepts either key)', () => {
    const r = otaOne('ios', { FAKE_UPDATE_SNAKE_DEBUGID: 'ios' });
    expect(r.status).toBe(0);
    expect(r.log.filter((l) => l.startsWith('npx sentry-expo-upload-sourcemaps dist'))).toHaveLength(1);
  });

  it('a non-string debugId does not hide a valid debug_id (each key is checked on its own)', () => {
    const r = otaOne('ios', { FAKE_UPDATE_SNAKE_DEBUGID: 'ios', FAKE_UPDATE_NUMERIC_DEBUGID: '1' });
    expect(r.status).toBe(0);
  });

  it('one platform without a debugId fails an all-platform OTA too', () => {
    const r = ota('production', 'production', { env: { FAKE_UPDATE_NO_DEBUGID: 'android' } });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('android source map');
    expect(r.all).toContain('has no readable debugId');
    expect(r.log.some((l) => l.startsWith('npx sentry-expo-upload-sourcemaps'))).toBe(false);
  });

  // The rule is @sentry/react-native's: `debugId` or `debug_id`, a non-empty string.
  // Anything else uploads a map Sentry never matches, so it must not pass silently.
  it.each([
    ['an empty debugId', '{"debugId":""}'],
    ['an empty debug_id', '{"debug_id":""}'],
    ['both keys empty', '{"debugId":"","debug_id":""}'],
    ['a numeric debugId', '{"debugId":1}'],
    ['a boolean debug_id', '{"debug_id":true}'],
    ['a null debugId', '{"debugId":null}'],
    ['an object debugId', '{"debugId":{"id":"00000000-0000-4000-8000-000000000003"}}'],
    ['a JSON null map', 'null'],
    ['a JSON array map', '[]'],
    ['a JSON string map', '"00000000-0000-4000-8000-000000000003"'],
  ])('a map with %s fails before any upload', (_case, body) => {
    const r = otaOne('ios', { FAKE_UPDATE_MAP_BODY: body });
    expect(r.status).not.toBe(0);
    expect(r.easCalls('update')).toHaveLength(1);
    expect(r.all).toMatch(/::error::\S+ios\/index\.hbc\.map has no debugId\./);
    expect(r.all).not.toContain('is not a readable source map');
    expect(r.all).toContain('::error::The OTA IS published, but its ios source map');
    expect(r.log.some((l) => l.startsWith('npx sentry-expo-upload-sourcemaps'))).toBe(false);
  });

  it.each([
    ['an empty debugId next to a valid debug_id', '{"debugId":"","debug_id":"00000000-0000-4000-8000-000000000003"}'],
    ['a valid debugId next to a non-string debug_id', '{"debugId":"00000000-0000-4000-8000-000000000003","debug_id":1}'],
  ])('a map with %s passes (either key is enough)', (_case, body) => {
    const r = otaOne('android', { FAKE_UPDATE_MAP_BODY: body });
    expect(r.status).toBe(0);
    expect(r.log.filter((l) => l.startsWith('npx sentry-expo-upload-sourcemaps dist'))).toHaveLength(1);
  });

  it('an empty map file fails as unreadable', () => {
    const r = otaOne('android', { FAKE_UPDATE_MAP_BODY: '' });
    expect(r.status).not.toBe(0);
    expect(r.all).toMatch(/::error::\S+android\/index\.hbc\.map is not a readable source map \(/);
    expect(r.all).toContain('has no readable debugId (cause above)');
    expect(r.log.some((l) => l.startsWith('npx sentry-expo-upload-sourcemaps'))).toBe(false);
  });

  it.each([
    ['android', (env: Record<string, string>) => otaOne('android', env)],
    ['all', (env: Record<string, string>) => ota('production', 'production', { env })],
  ])('an unreadable android map fails a %s OTA', (_platform, publish) => {
    const r = publish({ FAKE_UPDATE_BAD_MAP: 'android' });
    expect(r.status).not.toBe(0);
    expect(r.all).toMatch(/::error::\S+android\/index\.hbc\.map is not a readable source map \(/);
    expect(r.all).toContain('its android source map');
    expect(r.log.some((l) => l.startsWith('npx sentry-expo-upload-sourcemaps'))).toBe(false);
  });

  it('every map of a platform is checked, not only the first one found', () => {
    // A second map without a debugId next to a good one would upload and never resolve.
    const r = otaOne('ios', { FAKE_UPDATE_EXTRA_MAP: 'ios' });
    expect(r.status).not.toBe(0);
    expect(r.all).toMatch(/::error::\S+ios\/extra\.js\.map has no debugId\./);
    expect(r.log.some((l) => l.startsWith('npx sentry-expo-upload-sourcemaps'))).toBe(false);
  });

  it('a staging OTA with a Sentry token checks the debugId too', () => {
    const r = ota('staging', 'preview', { env: { FAKE_UPDATE_NO_DEBUGID: 'ios' } });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('its ios source map');
    expect(r.all).toContain('has no readable debugId');
    expect(r.log.some((l) => l.startsWith('npx sentry-expo-upload-sourcemaps'))).toBe(false);
  });

  it('a single-platform production OTA without its source map fails after publishing and says not to re-run', () => {
    const r = otaOne('android', { FAKE_UPDATE_NO_MAPS: 'android' });
    expect(r.status).not.toBe(0);
    expect(r.easCalls('update')).toHaveLength(1);
    expect(r.all).toContain('::error::The OTA IS published, but eas update wrote no android source map to dist/');
    expect(r.all).toContain('Do NOT re-run this job');
    expect(r.log.some((l) => l.startsWith('npx sentry-expo-upload-sourcemaps'))).toBe(false);
  });

  it.each([
    ['no SENTRY_AUTH_TOKEN', { env: { SENTRY_AUTH_TOKEN: '' } }, 'SENTRY_AUTH_TOKEN is empty'],
    ['no DSN in the EAS environment', { fakeFiles: { 'eas-env-production-project.txt': '' } }, 'EXPO_PUBLIC_SENTRY_DSN is missing'],
    ['no Sentry org/project', { env: { FAKE_NO_SENTRY_PLUGIN: '1' } }, 'The Sentry source map upload would fail'],
  ])('a production OTA refused for %s says that nothing was published', (_n, opts, reason) => {
    const r = ota('production', 'production', opts as RunOpts);
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(`::error::${reason}`);
    expect(r.all).toMatch(/Nothing was published|production OTA without it reports nothing/);
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('staging OTA without the token publishes with a warning (no DSN required)', () => {
    // The preview environment has no DSN (no fake file): staging does not require one.
    const r = ota('staging', 'preview', { env: { SENTRY_AUTH_TOKEN: '' } });
    expect(r.status).toBe(0);
    expect(r.easCalls('update')[0]).toContain('--environment preview');
    expect(r.all).toContain('::warning::SENTRY_AUTH_TOKEN is not set');
    expect(r.log.some((l) => l.startsWith('npx sentry-expo-upload-sourcemaps'))).toBe(false);
  });

  it('profil yoksa durur (process substitution hatası artık yutulmuyor)', () => {
    const r = ota('production', 'nope');
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('build.nope');
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('eas.json bozuksa plan durur, karar yazılmaz', () => {
    const r = plan('production', { easJson: () => '{ bozuk' });
    expect(r.status).not.toBe(0);
    expect(r.outputs.ios).toBeUndefined();
  });

  it.each([
    ['EXPO_PUBLIC_API_URL boş', { EXPO_PUBLIC_API_URL: '' }],
    ['EXPO_PUBLIC_API_URL eksik', { EXPO_PUBLIC_API_URL: undefined }],
    ['EXPO_PUBLIC_WEB_URL eksik', { EXPO_PUBLIC_WEB_URL: undefined }],
    ['EXPO_PUBLIC_ENVIRONMENT yanlış', { EXPO_PUBLIC_ENVIRONMENT: 'preview' }],
    ['API staging\'e bakıyor', { EXPO_PUBLIC_API_URL: 'https://staging.tarodan.com.tr/api' }],
    ['API http', { EXPO_PUBLIC_API_URL: 'http://tarodan.com.tr/api' }],
  ])('production OTA asla yayınlanmaz: %s', (_n, patch) => {
    const r = ota('production', 'production', {
      easJson: withEnv('production', patch),
      // Runner'dan sızan bir değer doğrulamayı geçirmemeli.
      env: { EXPO_PUBLIC_API_URL: 'https://tarodan.com.tr/api', EXPO_PUBLIC_WEB_URL: 'https://tarodan.com.tr' },
    });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('::error::');
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('production dalına başka kanalın profiliyle yayın yapılmaz', () => {
    const r = ota('production', 'preview');
    expect(r.status).not.toBe(0);
    expect(r.easCalls('update')).toHaveLength(0);
  });

  it('staging OTA preview env\'iyle geçer', () => {
    const r = ota('staging', 'preview');
    expect(r.status).toBe(0);
    expect(r.easCalls('update')[0]).toContain('EXPO_PUBLIC_API_URL=https://staging.tarodan.com.tr/api');
  });

  it.each([
    ['EXPO_PUBLIC_MAESTRO', '1'],
    ['EXPO_PUBLIC_MAESTRO_EMAIL', 'qa@example.com'],
  ])('test kancası profilde (%s) → production/staging OTA yayınlanmaz', (key, value) => {
    for (const [branch, profile] of [
      ['production', 'production'],
      ['staging', 'preview'],
    ]) {
      const r = ota(branch, profile, { easJson: withEnv(profile, { [key]: value }) });
      expect(r.status).not.toBe(0);
      expect(r.all).toContain(key);
      expect(r.easCalls('update')).toHaveLength(0);
    }
  });

  it("runner'dan sızan EXPO_PUBLIC_MAESTRO OTA bundle'ına taşınmaz (silinir, yayın sürer)", () => {
    const r = ota('production', 'production', { env: { EXPO_PUBLIC_MAESTRO: '1', EXPO_PUBLIC_MAESTRO_PASSWORD: 'x' } });
    expect(r.status).toBe(0);
    expect(r.easCalls('update')).toHaveLength(1);
  });

  it('build-submit: profilde test kancası varsa build alınmaz', () => {
    const r = run(['build-submit', 'ios', 'staging', 'staging'], {
      easJson: withEnv('staging', { EXPO_PUBLIC_MAESTRO: '1' }),
    });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('EXPO_PUBLIC_MAESTRO');
    expect(r.easCalls('build')).toHaveLength(0);
  });

  it.each([
    ['production', 'production', 'project'],
    ['production', 'production', 'account'],
    // `staging` mağaza profili eas.json'da ortam belirtmez → EAS onu production ortamıyla derler.
    ['staging', 'production', 'project'],
    ['staging', 'production', 'account'],
    // `preview` dahili dağıtım → preview ortamı.
    ['preview', 'preview', 'account'],
  ])('build-submit %s: EAS %s ortamında (%s kapsamı) EXPO_PUBLIC_MAESTRO varsa build alınmaz', (profile, env, scope) => {
    const r = run(['build-submit', 'ios', profile, '-'], {
      fakeFiles: { [`eas-env-${env}-${scope}.txt`]: 'EXPO_PUBLIC_SENTRY_DSN=*****\nEXPO_PUBLIC_MAESTRO=1\n' },
    });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(`EAS ${env} environment defines EXPO_PUBLIC_MAESTRO`);
    expect(r.easCalls('build')).toHaveLength(0);
  });

  it.each(['project', 'account'])('build-submit: EAS ortamı (%s kapsamı) okunamazsa build alınmaz (kapalı-başarısız)', (scope) => {
    for (const profile of ['production', 'staging']) {
      const r = run(['build-submit', 'ios', profile, '-'], { env: { FAKE_EAS_FAIL_ENV_LIST_SCOPE: scope } });
      expect(r.status).not.toBe(0);
      expect(r.easCalls('build')).toHaveLength(0);
    }
  });

  it('build-submit production: temiz ortamda (proje + hesap) build alınır', () => {
    const r = run(['build-submit', 'ios', 'production', '-'], {
      fakeFiles: { 'eas-env-production-project.txt': 'EXPO_PUBLIC_SENTRY_DSN=*****\n' },
    });
    expect(r.status).toBe(0);
    expect(r.easCalls('env:list')).toEqual([
      expect.stringContaining('env:list production --scope project'),
      expect.stringContaining('env:list production --scope account'),
    ]);
    expect(r.easCalls('build')).toHaveLength(1);
  });

  it('fingerprint de boş env ile hesaplanmaz (yanlış runtime → gereksiz build)', () => {
    const r = plan('staging', { easJson: withEnv('staging', { EXPO_PUBLIC_ENVIRONMENT: undefined }) });
    expect(r.status).not.toBe(0);
    expect(r.log.some((l) => l.includes('fingerprint:generate'))).toBe(false);
  });
});

describe('release.sh build-state — yalnız bitmiş + gönderilmiş build "binary mevcut"', () => {
  const FP = 'fp-ios-preview';
  const state = (builds: Build[], submissions: Submission[] = [], profiles = 'staging') =>
    run(['build-state', 'ios', profiles, FP, 'staging'], { builds, submissions });

  it.each([
    ['kuyrukta', 'IN_QUEUE'],
    ['yeni', 'NEW'],
    ['derleniyor', 'IN_PROGRESS'],
  ])('%s build → pending (mevcut değil)', (_n, status) => {
    expect(state([build({ id: 'b1', status })]).stdout.trim()).toBe('pending b1');
  });

  it('bitmiş ama hiç gönderilmemiş store build\'i → none', () => {
    const r = state([build({ id: 'b1' })]);
    expect(r.stdout.trim()).toBe('none');
    expect(r.easCalls('submit:list')).toHaveLength(1);
  });

  it('bitmiş, gönderimi başarısız → none', () => {
    expect(state([build({ id: 'b1' })], [submission('b1', 'ERRORED')]).stdout.trim()).toBe('none');
  });

  it.each(['AWAITING_BUILD', 'IN_QUEUE', 'IN_PROGRESS'])('bitmiş, gönderimi %s → pending', (st) => {
    expect(state([build({ id: 'b1' })], [submission('b1', st)]).stdout.trim()).toBe('pending b1');
  });

  it('bitmiş + gönderimi başarılı → available', () => {
    expect(state([build({ id: 'b1' })], [submission('b1')]).stdout.trim()).toBe('available b1');
  });

  it('başka build\'in gönderimi sayılmaz', () => {
    expect(state([build({ id: 'b1' })], [submission('other')]).stdout.trim()).toBe('none');
  });

  it('hatalı/iptal build\'ler sayılmaz', () => {
    const r = state([build({ id: 'e', status: 'ERRORED' }), build({ id: 'c', status: 'CANCELED' })]);
    expect(r.stdout.trim()).toBe('none');
    expect(r.easCalls('submit:list')).toHaveLength(0);
  });

  it('submit gerektirmeyen (internal/preview) build bitmişse yeter', () => {
    const apk = build({ id: 'apk', platform: 'ANDROID', profile: 'preview', runtime: FP });
    const r = run(['build-state', 'android', 'staging,preview', FP, 'staging'], { builds: [apk] });
    expect(r.stdout.trim()).toBe('available apk');
    expect(r.easCalls('submit:list')).toHaveLength(0);
  });

  it('eski eas-cli şekli (runtimeVersion) de tanınır', () => {
    const { runtime: _r, ...b } = build({ id: 'old' });
    const r = state([{ ...b, runtimeVersion: FP }], [submission('old')]);
    expect(r.stdout.trim()).toBe('available old');
  });

  it('tanınmayan JSON şekli → uyarı + none (güvenli taraf: OTA değil)', () => {
    const { runtime: _r, ...b } = build({ id: 'x' });
    const r = state([b], [submission('x')]);
    expect(r.stdout.trim()).toBe('none');
    expect(r.all).toContain('JSON şekli tanınmadı');
  });

  it('eas build:list hata verirse durur', () => {
    const r = run(['build-state', 'ios', 'staging', FP], { env: { FAKE_EAS_FAIL_BUILD_LIST: '1' } });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('eas build:list başarısız');
  });
});

describe('release.sh plan — bekleyen build: ikinci build yok; staging OTA yine çıkar, production bekler', () => {
  it('staging: derlenen build varken → OTA, build bitince yayınlanmak üzere (await), uyarısız', () => {
    const r = plan('staging', { env: { PLATFORM: 'ios' }, builds: [build({ id: 'b1', status: 'IN_PROGRESS' })] });
    expect(r.outputs.ios).toBe('ota');
    expect(JSON.parse(r.outputs.ota_matrix)).toEqual([{ platform: 'ios', fp: 'fp-ios-preview', await: true }]);
    expect(r.all).toContain('::notice::ios: bu runtime');
    expect(r.all).not.toContain('ULAŞMAYABİLİR');
    expect(r.easCalls('build')).toHaveLength(0);
  });

  it('staging: bitmiş ama TestFlight gönderimi süren build varken de OTA', () => {
    const b = build({ id: 'b1' });
    const r = plan('staging', { env: { PLATFORM: 'ios' }, builds: [b], submissions: [submission('b1', 'IN_PROGRESS')] });
    expect(r.outputs.ios).toBe('ota');
    expect(JSON.parse(r.outputs.ota_matrix)[0].await).toBe(true);
  });

  it('staging: binary hazırsa OTA beklemez (await yok)', () => {
    const ios = shipped('ios-1');
    const r = plan('staging', { env: { PLATFORM: 'ios' }, builds: [ios.b], submissions: [ios.s] });
    expect(JSON.parse(r.outputs.ota_matrix)).toEqual([{ platform: 'ios', fp: 'fp-ios-preview' }]);
  });

  it('production (hotfix): derlenen build varken → wait + uyarı, OTA yok', () => {
    const r = plan('production', {
      env: { PLATFORM: 'ios', SOURCE_REF: 'hotfix/x' },
      builds: [build({ id: 'p1', profile: 'production', status: 'IN_PROGRESS' })],
    });
    expect(r.outputs.ios).toBe('wait');
    expect(r.outputs.ota_matrix).toBe('[]');
    expect(r.all).toContain('::warning::ios: bu runtime');
  });

  it('production: bitmiş ama gönderilmemiş build → build (VERSION-GATE\'e tabi)', () => {
    const b = build({ id: 'p1', profile: 'production', appVersion: '1.0.4' });
    const r = plan('production', { env: { PLATFORM: 'ios' }, builds: [b] });
    expect(r.outputs.ios).toBe('build');
  });

  it('mode=ota binary yokken uyarır ama elle istendiği için OTA', () => {
    const r = plan('staging', { env: { PLATFORM: 'ios', MODE: 'ota' } });
    expect(r.outputs.ios).toBe('ota');
    expect(r.all).toContain('ULAŞMAYABİLİR');
  });

  it('recheck staging: arada başlamış build → ikinci build yok, OTA o build bitince (await)', () => {
    const r = run(['recheck', 'ios', 'staging'], {
      env: { FP: 'fp-ios-preview' },
      builds: [build({ id: 'b1', status: 'IN_QUEUE' })],
    });
    expect(r.outputs).toMatchObject({ action: 'ota', await: 'true' });
    expect(r.easCalls('build')).toHaveLength(0);
  });

  it('recheck staging: arada gönderilmiş binary → OTA beklemeden', () => {
    const ios = shipped('ios-1');
    const r = run(['recheck', 'ios', 'staging'], { env: { FP: 'fp-ios-preview' }, builds: [ios.b], submissions: [ios.s] });
    expect(r.outputs).toMatchObject({ action: 'ota', await: 'false' });
  });

  it('recheck production: arada başlamış build → skip (onaysız OTA yok)', () => {
    const r = run(['recheck', 'ios', 'production'], {
      env: { FP: 'fp-ios-production' },
      builds: [build({ id: 'p1', profile: 'production', status: 'IN_QUEUE' })],
    });
    expect(r.outputs.action).toBe('skip');
  });
});

describe('release.sh plan — production: sürüm merge\'ü her zaman store build\'i, hotfix fingerprint\'le', () => {
  // Canlıdaki binary: app.json sürümüyle (1.0.5) bitmiş + gönderilmiş production build'i.
  const live = shipped('live', { profile: 'production' });
  const liveAnd = shipped('live-a', { platform: 'ANDROID', profile: 'production' });
  const older = build({ id: 'old', profile: 'production', runtime: 'eski', appVersion: '1.0.4' });

  it.each([['development'], [''], ['feature/x']])(
    'sürüm (kaynak "%s"): yalnız JS değişti, sürüm artmadı → blocked, OTA HAZIRLANMAZ',
    (source) => {
      const r = plan('production', { env: { PLATFORM: 'ios', SOURCE_REF: source }, builds: [live.b], submissions: [live.s] });
      expect(r.status).toBe(0);
      expect(r.outputs).toMatchObject({ ios: 'blocked', ota_matrix: '[]', blocked: 'ios', decided: 'true' });
      expect(r.all).toContain('::error::ios: release merge');
      expect(r.all).toContain('mode=build');
      // master artık yayınlanmamış kod taşır: OTA önerilmez, aksine uyarılır.
      expect(r.all).not.toContain('-f mode=ota');
      expect(r.all).toContain('CAUTION');
    },
  );

  it('sürüm koşusu yeniden çalıştırılınca kendi build\'ini "son sürüm" saymaz (skip, blocked değil)', () => {
    // Bu commit'ten (SHA) alınmış 1.0.5 build'i bitip gönderilmiş; önceki sürüm 1.0.4.
    const mine = shipped('mine', { profile: 'production', commit: 'abcdef1234' });
    const prev = build({ id: 'prev', profile: 'production', runtime: 'eski', appVersion: '1.0.4', commit: 'eski' });
    const r = plan('production', {
      env: { PLATFORM: 'ios', SOURCE_REF: 'development' },
      builds: [mine.b, prev],
      submissions: [mine.s],
    });
    expect(r.outputs).toMatchObject({ ios: 'skip', blocked: '', ota_matrix: '[]' });
    expect(r.all).toContain('zaten gönderilmiş');
  });

  it('sürüm: başka bir commit aynı sürümle build almışsa yine blocked (sürüm artmadı)', () => {
    const other = shipped('other', { profile: 'production', commit: 'baska' });
    const r = plan('production', { env: { PLATFORM: 'ios', SOURCE_REF: 'development' }, builds: [other.b], submissions: [other.s] });
    expect(r.outputs.ios).toBe('blocked');
  });

  it('sürüm: native değişti, sürüm artmadı → blocked', () => {
    const r = plan('production', { env: { PLATFORM: 'ios', SOURCE_REF: 'development' }, builds: [build({ id: 'x', profile: 'production', runtime: 'eski' })] });
    expect(r.outputs).toMatchObject({ ios: 'blocked', ota_matrix: '[]' });
  });

  it('sürüm: expo.version son production build\'inden büyük → build (iOS ve Android)', () => {
    const olderAnd = build({ id: 'old-a', platform: 'ANDROID', profile: 'production', runtime: 'eski', appVersion: '1.0.4' });
    const r = plan('production', { env: { SOURCE_REF: 'development', ANDROID_ENABLED: 'true' }, builds: [older, olderAnd] });
    expect(r.outputs).toMatchObject({ ios: 'build', android: 'build', ota_matrix: '[]', blocked: '' });
    expect(r.all).toContain('ios: version 1.0.4 -> 1.0.5');
    expect(r.summary).toContain('`development` → release');
  });

  it('sürüm: ilk production build\'i → build', () => {
    expect(plan('production', { env: { PLATFORM: 'ios', SOURCE_REF: 'development' } }).outputs.ios).toBe('build');
  });

  it('sürüm: bu runtime\'ın build\'i sürüyorsa ikinci build yok (wait)', () => {
    const r = plan('production', {
      env: { PLATFORM: 'ios', SOURCE_REF: 'development' },
      builds: [older, build({ id: 'run', profile: 'production', status: 'IN_PROGRESS' })],
    });
    expect(r.outputs.ios).toBe('wait');
  });

  it('sürüm: fingerprint döngüsü koruması sürüm build\'ine de uygulanır', () => {
    const mm = (id: string) =>
      build({ id, profile: 'production', runtime: `eas-${id}`, message: `ci-fp:ci-${id}`, appVersion: '1.0.0' });
    const r = plan('production', { env: { PLATFORM: 'ios', SOURCE_REF: 'development' }, builds: [mm('a'), mm('b')] });
    expect(r.outputs.ios).toBe('blocked');
  });

  it('hotfix: yalnız JS → onaylı OTA (iki platform)', () => {
    const r = plan('production', {
      env: { SOURCE_REF: 'hotfix/odeme', ANDROID_ENABLED: 'true' },
      builds: [live.b, liveAnd.b],
      submissions: [live.s, liveAnd.s],
    });
    expect(r.outputs).toMatchObject({ ios: 'ota', android: 'ota', blocked: '' });
    expect(JSON.parse(r.outputs.ota_matrix)).toEqual([
      { platform: 'ios', fp: 'fp-ios-production' },
      { platform: 'android', fp: 'fp-android-production' },
    ]);
    expect(r.summary).toContain('`hotfix/odeme` → hotfix');
    // Gönderilmiş ≠ yayınlanmış: canlıdaki eski sürüme inmeyebileceği söylenir.
    expect(r.all).toContain('canlıdaki önceki sürümün kullanıcıları bu düzeltmeyi ALMAZ');
  });

  it('hotfix: native değişti, sürüm artmadı → blocked (VERSION-GATE)', () => {
    const r = plan('production', {
      env: { PLATFORM: 'ios', SOURCE_REF: 'hotfix/x' },
      builds: [build({ id: 'x', profile: 'production', runtime: 'eski' })],
    });
    expect(r.outputs.ios).toBe('blocked');
    expect(r.all).toContain('::error::ios: native code changed');
  });

  it('hotfix: sürüm artırılmış native düzeltme → build', () => {
    expect(plan('production', { env: { PLATFORM: 'ios', SOURCE_REF: 'hotfix/x' }, builds: [older] }).outputs.ios).toBe('build');
  });

  it('elle mode=ota kaynaktan bağımsız onaylı OTA', () => {
    const r = plan('production', { env: { PLATFORM: 'ios', MODE: 'ota' }, builds: [live.b], submissions: [live.s] });
    expect(r.outputs).toMatchObject({ ios: 'ota', blocked: '' });
  });

  it('elle mode=build aynı sürümün build\'ini alır (kapı yalnız uyarı)', () => {
    const r = plan('production', { env: { PLATFORM: 'ios', MODE: 'build' }, builds: [live.b], submissions: [live.s] });
    expect(r.outputs).toMatchObject({ ios: 'build', blocked: '' });
  });
});

describe('release.sh plan — VERSION-GATE platform başına', () => {
  const ANDROID = { ANDROID_ENABLED: 'true' };
  // iOS: native değişti (bu runtime için build yok), son production build'i 1.0.5
  // = app.json sürümü → kapı takılır. Android: binary var → OTA.
  const iosOld = build({ id: 'ios-old', profile: 'production', runtime: 'eski', appVersion: '9.9.9' });
  const and = shipped('and-1', { platform: 'ANDROID', profile: 'production' });

  it('hotfix: iOS kapısı takılırsa iOS blocked, Android OTA yine çıkar', () => {
    const r = plan('production', {
      env: { ...ANDROID, SOURCE_REF: 'hotfix/x' },
      builds: [iosOld, and.b],
      submissions: [and.s],
    });
    expect(r.status).toBe(0);
    expect(r.outputs).toMatchObject({
      ios: 'blocked',
      android: 'ota',
      ota_matrix: '[{"platform":"android","fp":"fp-android-production"}]',
      blocked: 'ios',
      decided: 'true',
    });
    expect(r.all).toContain('::error::ios: native code changed');
  });

  it('iki platform da takılırsa ikisi de blocked, OTA yok', () => {
    const andOld = build({ id: 'a-old', platform: 'ANDROID', profile: 'production', runtime: 'eski', appVersion: '9.9.9' });
    const r = plan('production', { env: ANDROID, builds: [iosOld, andOld] });
    expect(r.outputs).toMatchObject({ ios: 'blocked', android: 'blocked', blocked: 'ios android', ota_matrix: '[]' });
  });

  it('sürüm artmışsa build', () => {
    const older = build({ id: 'ios-old', profile: 'production', runtime: 'eski', appVersion: '1.0.0' });
    const r = plan('production', { env: { PLATFORM: 'ios' }, builds: [older] });
    expect(r.outputs).toMatchObject({ ios: 'build', blocked: '', decided: 'true' });
  });

  it('ilk production build\'inde kapı geçer', () => {
    expect(plan('production', { env: { PLATFORM: 'ios' } }).outputs.ios).toBe('build');
  });

  it('mode=build kapıyı uyarıya çevirir', () => {
    const r = plan('production', { env: { PLATFORM: 'ios', MODE: 'build' }, builds: [iosOld] });
    expect(r.outputs).toMatchObject({ ios: 'build', blocked: '' });
    expect(r.all).toContain('::warning::ios: native code changed');
  });

  it('decided=true en son yazılır; hata olursa hiç yazılmaz', () => {
    const ok = plan('staging', { env: { PLATFORM: 'ios' } });
    const keys = Object.keys(ok.outputs);
    expect(keys[keys.length - 1]).toBe('decided');
    const broken = plan('staging', { env: { PLATFORM: 'ios', FAKE_EAS_FAIL_BUILD_LIST: '1' } });
    expect(broken.status).not.toBe(0);
    expect(broken.outputs.decided).toBeUndefined();
  });
});

describe('release.sh — build kotası ve fingerprint döngüsü koruması', () => {
  const YESTERDAY = `${new Date(Date.now() - 86400000).toISOString().slice(0, 10)}T12:00:00.000Z`;
  // Bugün alınmış, başka runtime'lı (yani bu push'un binary'si olmayan) build'ler.
  const todays = (n: number, o: Partial<Parameters<typeof build>[0]> = {}) =>
    Array.from({ length: n }, (_, i) => build({ id: `t${i}`, runtime: `old-${i}`, ...o }));
  const iosOnly = { PLATFORM: 'ios' };

  it('staging: bugün 2 build alınmışsa (varsayılan sınır) build ALINMAZ, uyarı', () => {
    const r = plan('staging', { env: iosOnly, builds: todays(2) });
    expect(r.status).toBe(0);
    expect(r.outputs.ios).toBe('skip');
    expect(r.all).toContain('Kota koruması');
  });

  it('sınır vars.STAGING_MAX_BUILDS_PER_DAY ile değişir', () => {
    expect(plan('staging', { env: { ...iosOnly, MAX_BUILDS_PER_DAY: '3' }, builds: todays(2) }).outputs.ios).toBe('build');
    expect(plan('staging', { env: { ...iosOnly, MAX_BUILDS_PER_DAY: '0' } }).outputs.ios).toBe('skip');
  });

  it('dünkü build\'ler sayılmaz', () => {
    expect(plan('staging', { env: iosOnly, builds: todays(5, { createdAt: YESTERDAY }) }).outputs.ios).toBe('build');
  });

  it('elle mode=build kotayı atlar', () => {
    expect(plan('staging', { env: { ...iosOnly, MODE: 'build' }, builds: todays(9) }).outputs.ios).toBe('build');
  });

  it('production\'da günlük kota yok (sürüm kapısı zaten var)', () => {
    const r = plan('production', { env: iosOnly, builds: todays(5, { profile: 'production', appVersion: '1.0.0' }) });
    expect(r.outputs.ios).toBe('build');
  });

  // CI build'i: mesajında ci-fp damgası, EAS başka bir runtime damgalamış.
  const mismatched = (id: string, profile = 'staging', createdAt = YESTERDAY) =>
    build({ id, profile, runtime: `eas-${id}`, message: `ci-fp:ci-${id}`, createdAt, appVersion: '1.0.0' });

  it.each(['staging', 'production'] as const)('%s: son 2 CI build\'inde art arda tutmazlık → blocked', (env) => {
    const r = plan(env, { env: iosOnly, builds: [mismatched('a', env), mismatched('b', env)] });
    expect(r.outputs.ios).toBe('blocked');
    expect(r.outputs.blocked).toBe('ios');
    expect(r.all).toContain('Sonsuz build döngüsünü önlemek');
  });

  it('tek tutmazlık ya da araya giren eşleşme döngü sayılmaz', () => {
    expect(plan('staging', { env: iosOnly, builds: [mismatched('a')] }).outputs.ios).toBe('build');
    const ok = build({ id: 'ok', runtime: 'same', message: 'ci-fp:same', createdAt: YESTERDAY });
    expect(plan('staging', { env: iosOnly, builds: [mismatched('a'), ok, mismatched('b')] }).outputs.ios).toBe('build');
  });

  it('CI damgası olmayan (elle alınmış) build\'ler döngü sayımına girmez', () => {
    const manual = build({ id: 'm', runtime: 'x', createdAt: YESTERDAY });
    expect(plan('staging', { env: iosOnly, builds: [mismatched('a'), manual] }).outputs.ios).toBe('build');
  });

  it('build-submit fingerprint\'i build mesajına damgalar, tutmazsa uyarır', () => {
    const r = run(['build-submit', 'ios', 'staging', 'staging'], {
      env: { FP: 'fp-ci' },
      buildResult: [{ id: 'nb', status: 'FINISHED', runtime: { version: 'fp-eas' } }],
    });
    expect(r.status).toBe(0);
    expect(r.easCalls('build')[0]).toContain('--message ci-fp:fp-ci');
    expect(r.all).toContain("runtime 'fp-eas' damgaladı");
    expect(r.easCalls('submit')[0]).toContain('--id nb');
  });

  it('recheck staging: kilit beklerken kota dolduysa skip', () => {
    const r = run(['recheck', 'ios', 'staging'], { env: { FP: 'fp-ios-preview' }, builds: todays(2) });
    expect(r.outputs.action).toBe('skip');
  });

  it.each([
    ['plan', () => plan('staging', { env: { PLATFORM: 'ios', FAKE_EAS_FAIL_HISTORY: '1' } })],
    ['recheck', () => run(['recheck', 'ios', 'staging'], { env: { FP: 'fp-ios-preview', FAKE_EAS_FAIL_HISTORY: '1' } })],
  ])('%s: koruma sorgusu (build geçmişi) hata verirse build\'e DÜŞMEZ, durur', (_n, go) => {
    const r = go();
    expect(r.status).not.toBe(0);
    expect(r.outputs.action).toBeUndefined();
    expect(r.outputs.ios).toBeUndefined();
  });

  it('recheck: döngü tespitinde job kırmızı, build yok', () => {
    const r = run(['recheck', 'ios', 'staging'], {
      env: { FP: 'fp-ios-preview' },
      builds: [mismatched('a'), mismatched('b')],
    });
    expect(r.status).not.toBe(0);
    expect(r.outputs.action).toBe('skip');
  });
});

describe('release.sh guard-ref — elle tetiklemede ref koruması', () => {
  const guard = (env: string, REF: string, extra: Record<string, string> = {}) =>
    run(['guard-ref', env], { env: { REF, ...extra } });

  it.each([
    ['staging', 'refs/heads/development', {}],
    ['staging', 'refs/heads/development', { MODE: 'apk' }],
    ['staging', 'refs/heads/feature/x', { MODE: 'apk', APK_BRANCHES: 'development feature/*' }],
    ['production', 'refs/heads/master', {}],
  ])('%s %s %j → izinli', (env, ref, extra) => {
    expect(guard(env, ref, extra).status).toBe(0);
  });

  it.each([
    ['staging', 'refs/heads/feature/x', {}],
    ['staging', 'refs/heads/feature/x', { MODE: 'ota' }],
    ['staging', 'refs/heads/feature/x', { MODE: 'build', APK_BRANCHES: 'feature/*' }],
    ['staging', 'refs/heads/feature/x', { MODE: 'apk' }],
    ['staging', 'refs/tags/development', { MODE: 'apk' }],
    ['staging', 'refs/heads/master', {}],
    ['production', 'refs/heads/development', {}],
    ['production', 'refs/heads/hotfix/x', { MODE: 'build' }],
    ['production', '', {}],
  ])('%s %s %j → durur', (env, ref, extra) => {
    const r = guard(env, ref, extra);
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('::error::');
  });
});

describe('release.sh — Android paket doğrulaması (yanlış Play uygulamasına asla)', () => {
  it('staging profili com.tarodan.app.staging çözümlerse geçer (preview env\'iyle)', () => {
    const r = run(['assert-app-id', 'android', 'staging', 'com.tarodan.app.staging']);
    expect(r.status).toBe(0);
    expect(r.log).toContainEqual(expect.stringContaining('npx expo config --type public --json | EXPO_PUBLIC_ENVIRONMENT=preview'));
  });

  it('staging profili production paketini çözümlerse DURUR', () => {
    const r = run(['assert-app-id', 'android', 'staging', 'com.tarodan.app.staging'], {
      env: { FAKE_ANDROID_PACKAGE: 'com.tarodan.app' },
    });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain("'com.tarodan.app', beklenen 'com.tarodan.app.staging'");
  });

  it('production profili com.tarodan.app', () => {
    expect(run(['assert-app-id', 'android', 'production', 'com.tarodan.app']).status).toBe(0);
  });

  const submitWith = (appIdentifier?: string) =>
    run(['build-submit', 'android', 'staging', 'staging', 'com.tarodan.app.staging'], {
      buildResult: [{ id: 'nb', status: 'FINISHED', ...(appIdentifier ? { appIdentifier } : {}) }],
    });

  it('bitmiş build\'in appIdentifier\'ı eşleşirse gönderilir', () => {
    const r = submitWith('com.tarodan.app.staging');
    expect(r.status).toBe(0);
    expect(r.easCalls('submit')).toHaveLength(1);
  });

  it.each([['yanlış paket', 'com.tarodan.app'], ['okunamadı', undefined]])(
    'appIdentifier %s → GÖNDERİLMEZ',
    (_n, id) => {
      const r = submitWith(id);
      expect(r.status).not.toBe(0);
      expect(r.easCalls('submit')).toHaveLength(0);
    },
  );
});

describe('release.sh await-binary — staging OTA\'sı derlenen build\'den SONRA çıkar', () => {
  const FP = 'fp-ios-preview';
  const pending = [build({ id: 'b1', status: 'IN_PROGRESS' })];
  const fast = { AWAIT_INTERVAL: '0' };
  const runtimeQueries = (r: ReturnType<typeof run>) =>
    r.easCalls('build:list').filter((l) => l.includes('--runtime-version'));

  it('derleme bitince döner; TestFlight gönderimini BEKLEMEZ', () => {
    const r = run(['await-binary', 'ios', 'staging', FP], {
      env: fast,
      buildsSeq: [pending, pending, [build({ id: 'b1' })]],
      submissions: [submission('b1', 'IN_PROGRESS')],
    });
    expect(r.status).toBe(0);
    expect(runtimeQueries(r)).toHaveLength(3);
    expect(r.easCalls('submit:list')).toHaveLength(0);
    expect(r.all).toContain('OTA yayınlanıyor');
    expect(r.all).not.toContain('::warning::');
  });

  it('build başarısız olursa da döner (OTA zararsız: binary yok)', () => {
    const r = run(['await-binary', 'ios', 'staging', FP], {
      env: fast,
      buildsSeq: [pending, [build({ id: 'b1', status: 'ERRORED' })]],
    });
    expect(r.status).toBe(0);
    expect(runtimeQueries(r)).toHaveLength(2);
  });

  it('geçici EAS hatası beklemeyi düşürmez, yeniden denenir', () => {
    const r = run(['await-binary', 'ios', 'staging', FP], {
      env: fast,
      buildsSeq: [pending, 'FAIL' as unknown as Build[], [build({ id: 'b1' })]],
    });
    expect(r.status).toBe(0);
    expect(r.all).toContain('::warning::ios: EAS build listesi okunamadı');
    expect(r.all).toContain('OTA yayınlanıyor');
  });

  it('süre dolarsa uyarıyla döner, sonsuza dek beklemez', () => {
    const r = run(['await-binary', 'ios', 'staging', FP], { env: { ...fast, AWAIT_MINUTES: '0' }, builds: pending });
    expect(r.status).toBe(0);
    expect(runtimeQueries(r)).toHaveLength(1);
    expect(r.all).toContain('::warning::ios: runtime fp-ios-preview');
  });

  it('Android kapalıyken derlenen ad-hoc APK (preview) beklenir', () => {
    const apk = [build({ id: 'apk', platform: 'ANDROID', profile: 'preview', status: 'IN_PROGRESS' })];
    const r = run(['await-binary', 'android', 'staging', 'fp-android-preview'], {
      env: { ...fast, AWAIT_MINUTES: '0' },
      builds: apk,
    });
    expect(r.all).toContain('hâlâ derleniyor');
    expect(runtimeQueries(r).some((l) => l.includes('--build-profile preview'))).toBe(true);
  });

  it('Android açıkken preview APK sayılmaz (yalnız staging AAB beklenir)', () => {
    const apk = [build({ id: 'apk', platform: 'ANDROID', profile: 'preview', status: 'IN_PROGRESS' })];
    const r = run(['await-binary', 'android', 'staging', 'fp-android-preview'], {
      env: { ...fast, ANDROID_ENABLED: 'true' },
      builds: apk,
    });
    expect(r.all).toContain('derlenen build kalmadı');
    expect(runtimeQueries(r).every((l) => l.includes('--build-profile staging'))).toBe(true);
  });

  it('fingerprint boşsa durur', () => {
    expect(run(['await-binary', 'ios', 'staging', '']).status).not.toBe(0);
  });
});

describe('release.sh set-version — the release PR sets expo.version', () => {
  const setVersion = (...args: string[]) => run(['set-version', ...args], { readFiles: ['app.json'] });
  const versionOf = (r: ReturnType<typeof setVersion>) => JSON.parse(r.files['app.json']).expo.version;
  // In these scenarios app.json (temporary root) holds TEST_VERSION.
  const original = () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    j.expo.version = TEST_VERSION;
    return `${JSON.stringify(j, null, 2)}\n`;
  };

  it('sets a higher version', () => {
    const r = setVersion('1.1.0');
    expect(r.status).toBe(0);
    expect(versionOf(r)).toBe('1.1.0');
  });

  it('changes only the version line; the rest of the file stays byte for byte', () => {
    const r = setVersion('2.0.0');
    expect(r.files['app.json']).toBe(original().replace(`"version": "${TEST_VERSION}"`, '"version": "2.0.0"'));
  });

  it('the same version is a no-op', () => {
    const r = setVersion(TEST_VERSION);
    expect(r.status).toBe(0);
    expect(r.files['app.json']).toBe(original());
  });

  it('never lowers the version', () => {
    const r = setVersion('1.0.4');
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('lower');
    expect(r.files['app.json']).toBe(original());
  });

  it.each([['1.0'], ['abc'], ['1.0.6-beta'], ['1..6'], ['']])('refuses a version that is not X.Y.Z (%s)', (v) => {
    const r = setVersion(v);
    expect(r.status).not.toBe(0);
    expect(r.files['app.json']).toBe(original());
  });

  it('no longer offers bump-version (no post-release bump of development)', () => {
    const r = run(['bump-version', TEST_VERSION]);
    expect(r.status).not.toBe(0);
  });
});

/**
 * A throwaway git repository with release.sh and app.json committed, for
 * next-version / latest-release. Global and system git config are ignored (no
 * hooks, no signing, no user settings), and so are GIT_* variables of a caller
 * such as a pre-commit hook.
 */
function gitRepo(version = TEST_VERSION) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-git-'));
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  Object.assign(env, {
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test',
    GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'Test',
    GIT_COMMITTER_EMAIL: 'test@example.invalid',
  });
  const git = (args: string[], input?: string, cwd = dir) => {
    const res = spawnSync('git', args, { cwd, env, input, encoding: 'utf8' });
    if (res.status !== 0) throw new Error(`git ${args.join(' ')}: ${res.stderr}`);
    return res.stdout.trim();
  };
  const writeVersion = (v: string) => {
    const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    appJson.expo.version = v;
    fs.writeFileSync(path.join(dir, 'app.json'), `${JSON.stringify(appJson, null, 2)}\n`);
  };
  git(['init', '-q', '-b', 'development']);
  fs.mkdirSync(path.join(dir, 'scripts/ci'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(dir, 'scripts/ci/release.sh'));
  writeVersion(version);
  git(['add', '.']);
  git(['commit', '-q', '-m', 'chore: initial']);
  const repo = {
    dir,
    /** The isolated git environment (no global config, no caller GIT_* variables). */
    env,
    git,
    /** An empty commit with the full message (header, body, footers). */
    commit: (message: string) => {
      git(['commit', '-q', '--allow-empty', '-F', '-'], message);
      return git(['rev-parse', 'HEAD']);
    },
    /** Commits app.json with another expo.version (the release PR's commit). */
    commitVersion: (v: string, message = `chore(release): ${v}`) => {
      writeVersion(v);
      git(['add', 'app.json']);
      git(['commit', '-q', '-F', '-'], message);
    },
    tag: (name: string, ref = 'HEAD') => git(['tag', name, ref]),
    run: (args: string[], cwd = dir) => {
      const res = spawnSync('bash', [path.join(cwd, 'scripts/ci/release.sh'), ...args], {
        cwd,
        env,
        encoding: 'utf8',
      });
      if (res.error) throw res.error;
      return { status: res.status, stdout: res.stdout, stderr: res.stderr, all: `${res.stdout}\n${res.stderr}` };
    },
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
  return repo;
}

describe('release.sh next-version — computed from Conventional Commits since the last mobile-v tag', () => {
  let repo: ReturnType<typeof gitRepo>;
  beforeEach(() => {
    repo = gitRepo();
  });
  afterEach(() => repo.cleanup());

  /** Seed tag on the current commit, then the given commits on top. */
  const since = (...messages: string[]) => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    for (const m of messages) repo.commit(m);
    return repo.run(['next-version']);
  };

  it('fails with a clear message when there is no mobile-v tag (no guessed fallback)', () => {
    repo.tag('v1.0.5'); // the old prefix does not count
    repo.commit('feat: x');
    const r = repo.run(['next-version']);
    expect(r.status).not.toBe(0);
    expect(r.stdout).toBe('');
    expect(r.all).toContain('no mobile-vX.Y.Z tag');
  });

  it('only fixes and other types -> patch', () => {
    const r = since('fix: a', 'docs: b', 'refactor(ui): c', 'build(native): d');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('1.0.6\n');
  });

  it('any feat -> minor', () => {
    const r = since('fix: a', 'feat(checkout): b', 'chore: c');
    expect(r.stdout).toBe('1.1.0\n');
  });

  it.each([['feat!: drop x'], ['fix(api)!: change y'], ['refactor(ui,nav)!: z']])('%s -> major', (m) => {
    const r = since('feat: a', m);
    expect(r.stdout).toBe('2.0.0\n');
  });

  it.each([['BREAKING CHANGE'], ['BREAKING-CHANGE']])('a %s footer -> major', (token) => {
    const r = since('fix: a', `fix(auth): b\n\nWhy it changed.\n\n${token}: the old token is rejected`);
    expect(r.stdout).toBe('2.0.0\n');
  });

  it('a body that only mentions a breaking change (not a footer line) stays minor', () => {
    const r = since('feat: a\n\nThis is not a BREAKING CHANGE: callers keep working.');
    expect(r.stdout).toBe('1.1.0\n');
  });

  it('chore(release) commits are ignored, even with a !', () => {
    const r = since('fix: a', 'chore(release)!: 1.0.6', 'chore(release): development 1.0.6 (canlıda 1.0.5)');
    expect(r.stdout).toBe('1.0.6\n');
  });

  it('fails when nothing but chore(release) was committed since the tag', () => {
    const r = since('chore(release): 1.0.6');
    expect(r.status).not.toBe(0);
    expect(r.stdout).toBe('');
    expect(r.all).toContain('nothing to release');
  });

  it('a higher version already in app.json wins (manual override) with a notice', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.commit('fix: a');
    repo.commitVersion('1.3.0');
    const r = repo.run(['next-version']);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('1.3.0\n');
    expect(r.stderr).toContain('manual override');
  });

  it('after set-version to the computed version it prints the same version again', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.commit('feat: a');
    repo.commitVersion('1.1.0');
    expect(repo.run(['next-version']).stdout).toBe('1.1.0\n');
  });

  it('merge commits are ignored (only their non-merge commits count)', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.git(['switch', '-q', '-c', 'fix/side']);
    repo.commit('fix: side');
    repo.git(['switch', '-q', 'development']);
    repo.git(['merge', '-q', '--no-ff', 'fix/side', '-m', 'feat!: a merge message that must not count']);
    expect(repo.run(['next-version']).stdout).toBe('1.0.6\n');
  });

  it('finds the tag on a master merge commit that development does not contain', () => {
    // Topology of the real repo: release-bookkeeping tags master's merge commit.
    repo.commit('feat: released in 1.0.5');
    repo.git(['switch', '-q', '-c', 'master']);
    repo.git(['merge', '-q', '--no-ff', 'development', '-m', 'Merge branch development into master']);
    repo.git(['switch', '-q', 'development']);
    repo.tag(`mobile-v${TEST_VERSION}`, 'master');
    repo.commit('fix: after the release');
    const r = repo.run(['next-version']);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('1.0.6\n'); // the feat before the release is not counted again
  });

  it('counts from the highest mobile-vX.Y.Z tag; pre-release tags are ignored', () => {
    repo.tag('mobile-v1.0.4');
    repo.commit('feat: in 1.0.5');
    repo.tag('mobile-v1.0.5');
    repo.tag('mobile-v1.2.0-rc.1');
    repo.commit('fix: a');
    const r = repo.run(['next-version']);
    expect(r.stdout).toBe('1.0.6\n');
    expect(r.stderr).toContain('mobile-v1.0.5..HEAD');
  });

  it('takes a ref (the range ends there)', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    const fixSha = repo.commit('fix: a');
    repo.commit('feat: b');
    expect(repo.run(['next-version', fixSha]).stdout).toBe('1.0.6\n');
    expect(repo.run(['next-version', 'no-such-ref']).status).not.toBe(0);
  });

  it('refuses a shallow clone (the commit range would be incomplete)', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.commit('fix: a');
    repo.commit('feat: b');
    const shallow = path.join(repo.dir, 'shallow');
    repo.git(['clone', '-q', '--depth', '1', `file://${repo.dir}`, shallow]);
    const r = repo.run(['next-version'], shallow);
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('shallow');
  });

  it('stops when app.json at the ref is not X.Y.Z (no version is guessed from it)', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.commitVersion('1.1.0-rc.1', 'feat: a');
    const r = repo.run(['next-version']);
    expect(r.status).not.toBe(0);
    expect(r.stdout).toBe('');
    expect(r.all).toContain("app.json at HEAD holds '1.1.0-rc.1', not X.Y.Z");
  });

  it('notes a tag the ref does not contain (a hotfix not merged back) and still counts from it', () => {
    repo.git(['switch', '-q', '-c', 'master']);
    repo.commit('feat: hotfix released from master only');
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.git(['switch', '-q', 'development']);
    repo.commit('fix: a');
    const r = repo.run(['next-version']);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('1.0.6\n'); // the hotfix feat is in the tag, so not counted
    expect(r.stderr).toContain(`::notice::next-version: mobile-v${TEST_VERSION} has commits that HEAD does not contain`);
  });

  it('a git-generated Revert header counts as other (patch), not as the reverted type', () => {
    const r = since('Revert "feat: b"\n\nThis reverts commit 0123456789abcdef.');
    expect(r.stdout).toBe('1.0.6\n');
  });

  it('prints the reasoning on stderr with the counts per class', () => {
    const r = since('feat!: a', 'feat: b', 'fix: c', 'chore(release): 2.0.0');
    expect(r.stdout).toBe('2.0.0\n');
    expect(r.stderr).toContain(
      `mobile-v${TEST_VERSION}..HEAD: 1 breaking, 1 feat, 1 other, 1 chore(release) ignored -> major -> 2.0.0`,
    );
  });
});

describe('release.sh check-release-version — a release merge carries the computed version', () => {
  let repo: ReturnType<typeof gitRepo>;
  beforeEach(() => {
    repo = gitRepo();
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.commit('feat: a'); // next-version: 1.1.0
  });
  afterEach(() => repo.cleanup());
  const check = (env: Record<string, string> = {}) => {
    const res = spawnSync('bash', [path.join(repo.dir, 'scripts/ci/release.sh'), 'check-release-version'], {
      cwd: repo.dir,
      env: { ...repo.env, MODE: 'auto', SOURCE_REF: 'development', ...env },
      encoding: 'utf8',
    });
    return { status: res.status, all: `${res.stdout}\n${res.stderr}` };
  };

  it('fails a release merge without the release commit (version below next-version)', () => {
    const r = check();
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('call for 1.1.0');
    expect(r.all).toContain('set-version 1.1.0');
  });

  it('an unknown source counts as a release (the safe side)', () => {
    expect(check({ SOURCE_REF: '' }).status).not.toBe(0);
  });

  it('passes with the release commit', () => {
    repo.commitVersion('1.1.0');
    expect(check().status).toBe(0);
  });

  it('passes with a higher manual version', () => {
    repo.commitVersion('2.0.0');
    expect(check().status).toBe(0);
  });

  it('passes a re-run of a merge already tagged with its version', () => {
    repo.commitVersion('1.1.0');
    repo.tag('mobile-v1.1.0');
    const r = check();
    expect(r.status).toBe(0);
    expect(r.all).toContain('already tagged mobile-v1.1.0');
  });

  it('real topology: tag on the master merge, a hotfix not merged back still counts on the next release merge', () => {
    // development: feat (1.1.0 released via master merge M1, tagged there).
    repo.commitVersion('1.1.0');
    repo.git(['switch', '-q', '-c', 'master']);
    repo.git(['merge', '-q', '--no-ff', 'development', '-m', 'Merge pull request #1 from x/development']);
    repo.tag('mobile-v1.1.0');
    // A JS-only hotfix on master (OTA, no tag) with a feat; not merged back yet.
    repo.git(['switch', '-q', '-c', 'hotfix/x']);
    repo.commit('feat(push): hotfix that is also a feature');
    repo.git(['switch', '-q', 'master']);
    repo.git(['merge', '-q', '--no-ff', 'hotfix/x', '-m', 'Merge pull request #2 from x/hotfix/x']);
    // development: only a fix and the release commit for 1.1.1.
    repo.git(['switch', '-q', 'development']);
    repo.commit('fix: a');
    repo.commitVersion('1.1.1');
    expect(check().status).toBe(0); // on development the range has only the fix
    // The release merge (= the PR's merge ref) also contains the hotfix feat.
    repo.git(['switch', '-q', 'master']);
    repo.git(['merge', '-q', '--no-ff', 'development', '-m', 'Merge pull request #3 from x/development']);
    const r = check();
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('call for 1.2.0');
    // Merge commits never count: only the hotfix feat, the fix and the release commit.
    expect(r.all).toContain('0 breaking, 1 feat, 1 other, 1 chore(release) ignored');
  });

  it('fails, never passes silently, when the clone has no mobile-v tag', () => {
    repo.git(['tag', '-d', `mobile-v${TEST_VERSION}`]);
    repo.commitVersion('1.1.0');
    const r = check();
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('no mobile-vX.Y.Z tag');
    expect(r.all).not.toContain('check-release-version: OK');
  });

  it('fails on a shallow clone instead of comparing against an incomplete range', () => {
    repo.commitVersion('1.1.0');
    const shallow = path.join(repo.dir, 'shallow');
    repo.git(['clone', '-q', '--depth', '1', `file://${repo.dir}`, shallow]);
    const res = spawnSync('bash', [path.join(shallow, 'scripts/ci/release.sh'), 'check-release-version'], {
      cwd: shallow,
      env: { ...repo.env, MODE: 'auto', SOURCE_REF: 'development' },
      encoding: 'utf8',
    });
    expect(res.status).not.toBe(0);
    expect(`${res.stdout}\n${res.stderr}`).toContain('shallow clone');
  });

  it('only a tag of the current X.Y.Z on HEAD counts as a re-run (an rc tag does not)', () => {
    repo.tag(`mobile-v${TEST_VERSION}-rc.1`);
    const r = check();
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('call for 1.1.0');
  });

  it.each([
    ['a hotfix (a JS-only one keeps its version)', { SOURCE_REF: 'hotfix/crash' }],
    ['mode=build', { MODE: 'build' }],
    ['mode=ota', { MODE: 'ota' }],
  ])('skips %s', (_n, env) => {
    const r = check(env);
    expect(r.status).toBe(0);
    expect(r.all).toContain('skipped');
  });
});

describe('release.sh latest-release — highest released mobile-vX.Y.Z', () => {
  let repo: ReturnType<typeof gitRepo>;
  beforeEach(() => {
    repo = gitRepo();
  });
  afterEach(() => repo.cleanup());

  it('prints nothing (and succeeds) when there is no release tag', () => {
    repo.tag('v1.0.5');
    const r = repo.run(['latest-release']);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('semver order, not string order; rc and old-prefix tags ignored', () => {
    for (const t of ['mobile-v1.0.9', 'mobile-v1.0.10', 'mobile-v1.1.0-rc.1', 'v9.9.9']) repo.tag(t);
    expect(repo.run(['latest-release']).stdout).toBe('1.0.10\n');
  });

  it('with <below>: the highest release lower than it (the previous release)', () => {
    for (const t of ['mobile-v1.0.5', 'mobile-v1.1.0', 'mobile-v1.2.0']) repo.tag(t);
    expect(repo.run(['latest-release', '1.2.0']).stdout).toBe('1.1.0\n');
    expect(repo.run(['latest-release', '1.0.5']).stdout).toBe('');
  });
});

describe('release.sh — called from outside the checkout with a relative app.json', () => {
  // The script lives elsewhere (e.g. $RUNNER_TEMP) and gets `app.json` relative to
  // the working directory; it must not resolve it as a package name.
  const ciLike = (args: string[], version = '1.0.6') => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'release-ci-'));
    const repo = path.join(tmp, 'repo');
    const runnerTemp = path.join(tmp, 'runner-temp');
    fs.mkdirSync(repo);
    fs.mkdirSync(runnerTemp);
    fs.copyFileSync(SCRIPT, path.join(runnerTemp, 'release.sh'));
    const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    appJson.expo.version = version;
    fs.writeFileSync(path.join(repo, 'app.json'), `${JSON.stringify(appJson, null, 2)}\n`);
    const res = spawnSync('bash', [path.join(runnerTemp, 'release.sh'), ...args], {
      cwd: repo,
      encoding: 'utf8',
      env: process.env,
    });
    const result = {
      status: res.status,
      all: `${res.stdout}\n${res.stderr}`,
      version: JSON.parse(fs.readFileSync(path.join(repo, 'app.json'), 'utf8')).expo.version,
    };
    fs.rmSync(tmp, { recursive: true, force: true });
    return result;
  };

  it('set-version works with a relative app.json', () => {
    const r = ciLike(['set-version', '1.1.0', 'app.json']);
    expect(r.status).toBe(0);
    expect(r.version).toBe('1.1.0');
  });

  it('app-version göreli app.json\'u okur', () => {
    const r = ciLike(['app-version', 'app.json'], '2.3.4');
    expect(r.status).toBe(0);
    expect(r.all.trim()).toContain('2.3.4');
  });

  it.each([['1.2.4-rc.1'], ['1.2']])('stops if the current version is not X.Y.Z (%s), never skips silently', (v) => {
    const r = ciLike(['set-version', '1.3.0', 'app.json'], v);
    expect(r.status).not.toBe(0);
    expect(r.version).toBe(v);
    expect(r.all).toContain('X.Y.Z');
  });
});

/**
 * mobile-production.yml `release-bookkeeping`, executed: the step's script runs in a
 * throwaway repository with a bare `origin` and a fake `gh`, so the tag and Release
 * rules are pinned by what happens, not only by the strings in the YAML
 * (releaseWorkflow.test.ts pins those and the job's `if`).
 */
describe('release-bookkeeping step — tags the released commit and creates its Release', () => {
  const STEP = 'Tag the released commit + GitHub Release';
  const script = (
    parse(fs.readFileSync(path.join(ROOT, '.github/workflows/mobile-production.yml'), 'utf8')) as {
      jobs: Record<string, { steps: { name?: string; run?: string }[] }>;
    }
  ).jobs['release-bookkeeping'].steps.find((s) => s.name === STEP)?.run;
  // `gh release view` succeeds only with FAKE_GH_RELEASE_EXISTS; `gh release create` is logged.
  const GH_FAKE = [
    '#!/usr/bin/env bash',
    'echo "gh $*" >> "$FAKE_GH_LOG"',
    'if [ "$1 $2" = "release view" ]; then [ -n "${FAKE_GH_RELEASE_EXISTS:-}" ]; exit $?; fi',
    'if [ "$1 $2" = "release create" ]; then exit 0; fi',
    'echo "fake gh: unexpected $*" >&2; exit 2',
    '',
  ].join('\n');

  let repo: ReturnType<typeof gitRepo>;
  let tmp: string;
  let origin: string;
  beforeEach(() => {
    repo = gitRepo();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'release-bookkeeping-'));
    origin = path.join(tmp, 'origin.git');
    repo.git(['init', '-q', '--bare', origin], undefined, tmp);
    repo.git(['remote', 'add', 'origin', origin]);
    fs.mkdirSync(path.join(tmp, 'bin'));
    fs.writeFileSync(path.join(tmp, 'bin/gh'), GH_FAKE, { mode: 0o755 });
    fs.mkdirSync(path.join(tmp, 'runner'));
  });
  afterEach(() => {
    repo.cleanup();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const bookkeep = (env: Record<string, string> = {}) => {
    const sha = repo.git(['rev-parse', 'HEAD']);
    const file = path.join(tmp, 'step.sh');
    const log = path.join(tmp, 'gh.log');
    fs.writeFileSync(file, script!);
    fs.writeFileSync(log, '');
    // The shell GitHub Actions uses for `run:`.
    const res = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', file], {
      cwd: repo.dir,
      env: {
        ...repo.env,
        PATH: `${path.join(tmp, 'bin')}:${process.env.PATH}`,
        SHA: sha,
        GH_TOKEN: 'test-token',
        RUNNER_TEMP: path.join(tmp, 'runner'),
        FAKE_GH_LOG: log,
        ...env,
      },
      encoding: 'utf8',
    });
    if (res.error) throw res.error;
    const gh = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean);
    return { status: res.status, all: `${res.stdout}\n${res.stderr}`, sha, gh, creates: gh.filter((l) => l.startsWith('gh release create')) };
  };
  /** The commit a tag points to in `origin` ('' if the tag is not there). */
  const remoteTag = (tag: string) => {
    const r = spawnSync('git', ['--git-dir', origin, 'rev-parse', '-q', '--verify', `refs/tags/${tag}^{commit}`], {
      env: repo.env,
      encoding: 'utf8',
    });
    return r.status === 0 ? r.stdout.trim() : '';
  };

  it('finds its step in the workflow', () => {
    expect(script).toContain('git tag -a "$tag" "$SHA"');
  });

  it('tags the released commit with an annotated mobile-v tag and creates the Release with notes since the previous one', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.commit('feat: a');
    repo.commitVersion('1.1.0');
    const r = bookkeep();
    expect(r.status).toBe(0);
    expect(remoteTag('mobile-v1.1.0')).toBe(r.sha);
    expect(repo.git(['cat-file', '-t', 'mobile-v1.1.0'])).toBe('tag');
    expect(r.creates).toEqual([
      `gh release create mobile-v1.1.0 --verify-tag --title Tarodan 1.1.0 --generate-notes --notes-start-tag mobile-v${TEST_VERSION}`,
    ]);
  });

  it('without a previous release tag the notes have no start tag', () => {
    repo.commitVersion('1.1.0');
    const r = bookkeep();
    expect(r.status).toBe(0);
    expect(remoteTag('mobile-v1.1.0')).toBe(r.sha);
    expect(r.creates).toEqual(['gh release create mobile-v1.1.0 --verify-tag --title Tarodan 1.1.0 --generate-notes']);
  });

  it('a rebuild of a tagged version leaves the tag on the first submitted commit', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.commitVersion('1.1.0');
    const first = repo.git(['rev-parse', 'HEAD']);
    repo.tag('mobile-v1.1.0');
    repo.git(['push', '-q', 'origin', 'refs/tags/mobile-v1.1.0']);
    repo.commit('fix: app review feedback'); // mode=build of the same version
    const r = bookkeep();
    expect(r.status).toBe(0);
    expect(r.all).toContain(`::warning::mobile-v1.1.0 is already on ${first}; not moved (this run: ${r.sha}).`);
    expect(repo.git(['rev-parse', 'mobile-v1.1.0^{commit}'])).toBe(first);
    expect(remoteTag('mobile-v1.1.0')).toBe(first);
  });

  it('a version not above the highest released tag gets no tag and no Release (warning, job green)', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.tag('mobile-v1.2.0');
    repo.commitVersion('1.1.0');
    const r = bookkeep();
    expect(r.status).toBe(0);
    expect(r.all).toContain('::warning::1.1.0 is not greater than the highest released tag (mobile-v1.2.0); no tag or Release created.');
    expect(remoteTag('mobile-v1.1.0')).toBe('');
    expect(r.gh).toEqual([]);
  });

  it('a version that is not X.Y.Z fails the job before any tag or Release', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.commitVersion('1.1.0-rc.1');
    const r = bookkeep();
    expect(r.status).not.toBe(0);
    expect(r.all).toContain("latest-release: '1.1.0-rc.1' is not X.Y.Z");
    expect(remoteTag('mobile-v1.1.0-rc.1')).toBe('');
    expect(r.gh).toEqual([]);
  });

  it('an existing Release is left alone (safe to re-run)', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.commitVersion('1.1.0');
    const r = bookkeep({ FAKE_GH_RELEASE_EXISTS: '1' });
    expect(r.status).toBe(0);
    expect(r.gh).toEqual(['gh release view mobile-v1.1.0']);
  });

  it('a failed tag push fails the job and creates no Release (a store release never ends untagged silently)', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.commitVersion('1.1.0');
    repo.git(['remote', 'set-url', 'origin', path.join(tmp, 'missing.git')]);
    const r = bookkeep();
    expect(r.status).not.toBe(0);
    expect(r.creates).toEqual([]);
  });

  it('a tag another run of the same version pushed meanwhile is accepted', () => {
    repo.tag(`mobile-v${TEST_VERSION}`);
    repo.commitVersion('1.1.0');
    const sha = repo.git(['rev-parse', 'HEAD']);
    repo.git(['push', '-q', 'origin', 'HEAD:refs/heads/master']);
    // A different annotated tag object for the same commit: the push is rejected.
    repo.git(['--git-dir', origin, 'tag', '-a', 'mobile-v1.1.0', sha, '-m', 'other run']);
    const r = bookkeep();
    expect(r.status).toBe(0);
    expect(r.all).toContain('::warning::mobile-v1.1.0 was already created by another run.');
    expect(r.creates).toHaveLength(1);
  });
});

describe('Master source guard step — a hotfix/* must be cut from master', () => {
  const script = (
    parse(fs.readFileSync(path.join(ROOT, '.github/workflows/master-flow.yml'), 'utf8')) as {
      jobs: Record<string, { steps: { run?: string }[] }>;
    }
  ).jobs['source-guard'].steps.find((s) => s.run)?.run;
  // Answers the guard's compare calls from a real local repo, the way the REST API
  // does (`compare/A...B`, query string and --paginate ignored: one page): the commits
  // B adds over the merge base of A and B (`git rev-list $(merge-base A B)..B`; GitHub,
  // like git, picks one merge base) as `.total_commits` and as "<sha> <parents>" lines,
  // and `.status`: identical | ahead (B contains A) | behind | diverged. FAKE_GH_FAIL
  // makes every call fail, FAKE_GH_FAIL_JQ=<jq> only the calls with that jq;
  // FAKE_GH_TOTAL / FAKE_GH_LIST / FAKE_GH_STATUS replace those answers;
  // FAKE_GH_STATUS_<sha> answers the status call for that one root (FAIL = HTTP 502).
  const GH_FAKE = [
    '#!/usr/bin/env bash',
    'echo "gh $*" >> "$FAKE_GH_LOG"',
    '[ -z "${FAKE_GH_FAIL:-}" ] || { echo "fake gh: HTTP 502" >&2; exit 1; }',
    'path=""; jq=""',
    '[ "$1" = api ] || { echo "fake gh: unexpected $*" >&2; exit 2; }',
    'shift',
    'while [ $# -gt 0 ]; do',
    '  case "$1" in',
    '    --paginate) ;;',
    '    --jq) shift; jq="$1" ;;',
    '    repos/*/compare/*) path="$1" ;;',
    '    *) echo "fake gh: unexpected argument $1" >&2; exit 2 ;;',
    '  esac',
    '  shift',
    'done',
    '[ -n "$path" ] && [ -n "$jq" ] || { echo "fake gh: unexpected call" >&2; exit 2; }',
    '[ "${FAKE_GH_FAIL_JQ:-}" != "$jq" ] || { echo "fake gh: HTTP 502" >&2; exit 1; }',
    'spec="${path#repos/*/compare/}"; spec="${spec%%[?]*}"; a="${spec%%...*}"; b="${spec#*...}"',
    'g() { git -C "$FAKE_GIT_DIR" "$@"; }',
    'case "$jq" in',
    '  .total_commits)',
    '    if [ -n "${FAKE_GH_TOTAL+x}" ]; then echo "$FAKE_GH_TOTAL"; exit 0; fi',
    '    mb="$(g merge-base "$a" "$b")" || exit 1; g rev-list --count "$mb..$b" ;;',
    "  '.commits[] | ([.sha] + [.parents[].sha]) | join(\" \")')",
    '    if [ -n "${FAKE_GH_LIST+x}" ]; then printf "%s" "$FAKE_GH_LIST"; exit 0; fi',
    '    mb="$(g merge-base "$a" "$b")" || exit 1; g rev-list --parents "$mb..$b" ;;',
    '  .status)',
    '    v="FAKE_GH_STATUS_$a"',
    '    if [ -n "${!v+x}" ]; then [ "${!v}" != FAIL ] || { echo "fake gh: HTTP 502" >&2; exit 1; }; echo "${!v}"; exit 0; fi',
    '    if [ -n "${FAKE_GH_STATUS+x}" ]; then echo "$FAKE_GH_STATUS"; exit 0; fi',
    '    ra="$(g rev-parse "$a^{commit}")" || exit 1; rb="$(g rev-parse "$b^{commit}")" || exit 1',
    '    if [ "$ra" = "$rb" ]; then echo identical',
    '    elif g merge-base --is-ancestor "$ra" "$rb"; then echo ahead',
    '    elif g merge-base --is-ancestor "$rb" "$ra"; then echo behind',
    '    else echo diverged; fi ;;',
    '  *) echo "fake gh: unexpected jq $jq" >&2; exit 2 ;;',
    'esac',
    '',
  ].join('\n');

  let repo: ReturnType<typeof gitRepo>;
  let tmp: string;
  beforeEach(() => {
    // development and master start equal; master then gets a release merge.
    repo = gitRepo();
    repo.git(['branch', 'master']);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'source-guard-'));
    fs.mkdirSync(path.join(tmp, 'bin'));
    fs.writeFileSync(path.join(tmp, 'bin/gh'), GH_FAKE, { mode: 0o755 });
  });
  afterEach(() => {
    repo.cleanup();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  /** Runs the guard for a PR whose head is `ref` (HEAD_SHA = its commit). */
  const guard = (headRef: string, ref: string, env: Record<string, string> = {}) => {
    const file = path.join(tmp, 'step.sh');
    const log = path.join(tmp, 'gh.log');
    fs.writeFileSync(file, script!);
    fs.writeFileSync(log, '');
    const res = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', file], {
      cwd: tmp,
      env: {
        ...repo.env,
        PATH: `${path.join(tmp, 'bin')}:${process.env.PATH}`,
        GH_TOKEN: 'test-token',
        HEAD_REF: headRef,
        HEAD_SHA: repo.git(['rev-parse', ref]),
        HEAD_REPO: 'tarodan/tarodan-mobile',
        REPO: 'tarodan/tarodan-mobile',
        FAKE_GIT_DIR: repo.dir,
        FAKE_GH_LOG: log,
        ...env,
      },
      encoding: 'utf8',
    });
    if (res.error) throw res.error;
    const gh = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean);
    return { status: res.status, all: `${res.stdout}\n${res.stderr}`, gh };
  };
  /** A branch from `from` with one fix commit; returns its name. */
  const branchFrom = (name: string, from: string) => {
    repo.git(['switch', '-q', '-c', name, from]);
    repo.commit(`fix: ${name}`);
    repo.git(['switch', '-q', 'development']);
    return name;
  };
  /** Releases development into master with a merge commit, as the release PR does. */
  const release = () => {
    repo.git(['switch', '-q', 'master']);
    repo.git(['merge', '-q', '--no-ff', '-m', 'Merge development', 'development']);
    repo.git(['switch', '-q', 'development']);
  };

  it('finds its step in the workflow', () => {
    expect(script).toContain('case "$HEAD_REF" in');
  });

  it('a hotfix cut from master passes, also while development holds unreleased commits', () => {
    repo.commit('feat: released');
    release();
    repo.commit('feat: unreleased on development');
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash');
    expect([r.status, r.all]).toEqual([0, expect.stringContaining('OK: hotfix/crash -> master')]);
    expect(r.gh).toHaveLength(3);
  });

  it('a hotfix merged into development before master fails, and the message says why', () => {
    // Its own commit is then shared with development but not on master yet; ancestry
    // cannot tell it from development code, so the guard stays closed.
    branchFrom('hotfix/crash', 'master');
    repo.git(['merge', '-q', '--no-ff', '-m', 'Merge hotfix/crash', 'hotfix/crash']);
    const r = guard('hotfix/crash', 'hotfix/crash');
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('cut a hotfix branch with a new name from origin/master, cherry-pick the fix commits onto it');
  });

  it('a hotfix cut from development with unreleased commits fails (they would ship as an OTA)', () => {
    repo.commit('feat: released');
    release();
    repo.commit('feat: unreleased on development');
    const unreleased = repo.git(['rev-parse', 'development']);
    const r = guard(branchFrom('hotfix/crash', 'development'), 'hotfix/crash');
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('::error::hotfix/crash carries development commits that are not on master');
    expect(r.all).toContain(`(${unreleased} is on development; compare status: identical)`);
    expect(r.all).toContain('A hotfix must be cut from master: git switch -c hotfix/<name> origin/master');
    expect(r.all).not.toContain('OK:');
  });

  it('a hotfix cut from a development that already contains master fails too', () => {
    // development took master back (the hotfix back-merge) and then moved on: master is
    // the merge base, and what the hotfix adds over it includes development commits.
    repo.commit('feat: released');
    release();
    repo.git(['merge', '-q', '--no-ff', '-m', 'Merge master', 'master']);
    // The back-merge commit is the root of what the hotfix adds; development holds it.
    const backMerge = repo.git(['rev-parse', 'HEAD']);
    repo.commit('feat: unreleased on development');
    const r = guard(branchFrom('hotfix/crash', 'development'), 'hotfix/crash');
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('carries development commits that are not on master');
    expect(r.all).toContain(`(${backMerge} is on development; compare status: ahead)`);
  });

  it('a hotfix cut from master passes while master is ahead of development (earlier hotfix not back-merged)', () => {
    branchFrom('hotfix/first', 'master');
    repo.git(['switch', '-q', 'master']);
    repo.git(['merge', '-q', '--no-ff', '-m', 'Merge hotfix/first', 'hotfix/first']);
    repo.git(['switch', '-q', 'development']);
    repo.commit('feat: unreleased on development');
    const r = guard(branchFrom('hotfix/second', 'master'), 'hotfix/second');
    expect(r.status).toBe(0);
    expect(r.all).toContain('OK: hotfix/second -> master (cut from master; none of its 1 commits over master is on development)');
  });

  // Criss-cross: a feature branch cut before a release and merged into development
  // after it gives development and a hotfix that merges it two merge bases, the
  // released development tip (on master) and the feature tip (not on master). A check
  // of one merge base (GitHub's compare gives one) admitted it; the guard checks every
  // commit the hotfix adds over master instead, so the feature commit is found.
  it('a hotfix that merges a feature branch already merged into development fails', () => {
    const at = (date: string, fn: () => void) => {
      Object.assign(repo.env, { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
      try {
        fn();
      } finally {
        delete repo.env.GIT_AUTHOR_DATE;
        delete repo.env.GIT_COMMITTER_DATE;
      }
    };
    at('2030-01-02T00:00:00Z', () => branchFrom('feat/unreleased', 'development'));
    at('2030-01-03T00:00:00Z', () => repo.commit('feat: released'));
    at('2030-01-04T00:00:00Z', release);
    at('2030-01-05T00:00:00Z', () => repo.git(['merge', '-q', '--no-ff', '-m', 'Merge feat', 'feat/unreleased']));
    at('2030-01-06T00:00:00Z', () => branchFrom('hotfix/crash', 'master'));
    at('2030-01-07T00:00:00Z', () => {
      repo.git(['switch', '-q', 'hotfix/crash']);
      repo.git(['merge', '-q', '--no-ff', '-m', 'Merge feat', 'feat/unreleased']);
      repo.git(['switch', '-q', 'development']);
    });
    // The hotfix does carry a development commit that master lacks, and there are two
    // merge bases (the case a single merge base check misses):
    expect(() => repo.git(['merge-base', '--is-ancestor', 'feat/unreleased', 'master'])).toThrow();
    expect(repo.git(['merge-base', '--all', 'development', 'hotfix/crash']).split('\n')).toHaveLength(2);
    const feature = repo.git(['rev-parse', 'feat/unreleased']);
    const r = guard('hotfix/crash', 'hotfix/crash');
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(`::error::hotfix/crash carries development commits that are not on master (${feature} is on development; compare status: ahead)`);
    expect(r.all).not.toContain('OK:');
  });

  it('a hotfix cut from master that merged development later fails', () => {
    repo.commit('feat: released');
    release();
    repo.commit('feat: unreleased on development');
    branchFrom('hotfix/crash', 'master');
    repo.git(['switch', '-q', 'hotfix/crash']);
    repo.git(['merge', '-q', '--no-ff', '-m', 'Merge development', 'development']);
    repo.git(['switch', '-q', 'development']);
    const r = guard('hotfix/crash', 'hotfix/crash');
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('carries development commits that are not on master');
  });

  it('a hotfix cut from a development that is fully released passes (nothing unreleased)', () => {
    repo.commit('feat: released');
    release();
    const r = guard(branchFrom('hotfix/crash', 'development'), 'hotfix/crash');
    expect(r.status).toBe(0);
    expect(r.all).toContain('OK: hotfix/crash -> master (cut from master; none of its 1 commits over master is on development)');
  });

  it('an API failure fails the guard (closed)', () => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_FAIL: '1' });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('fake gh: HTTP 502');
    expect(r.all).not.toContain('OK:');
    expect(r.gh).toHaveLength(1);
  });

  it('a failing status call fails the guard (closed), after a good commit list', () => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_FAIL_JQ: '.status' });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('fake gh: HTTP 502');
    expect(r.all).not.toContain('OK:');
    expect(r.gh).toHaveLength(3);
  });

  it('a failing list call fails the guard (closed), after a good total', () => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', {
      FAKE_GH_FAIL_JQ: '.commits[] | ([.sha] + [.parents[].sha]) | join(" ")',
    });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('fake gh: HTTP 502');
    expect(r.all).not.toContain('OK:');
    expect(r.gh).toHaveLength(2);
  });

  /** `n` linear "<sha> <parent>" lines; the first parent is outside the list. */
  const chain = (n: number) =>
    Array.from({ length: n }, (_v, i) => `${(i + 1).toString(16).padStart(40, '0')} ${i.toString(16).padStart(40, '0')}`).join('\n');

  it.each([[''], ['null'], ['12a'], ['-1']])('a total answered as %j fails before the list', (total) => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_TOTAL: total });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(`::error::The API gave '${total}' as the number of commits hotfix/crash adds over master; the hotfix cannot be checked.`);
    expect(r.gh).toHaveLength(1);
  });

  it('no commits over master fail with their own message, before the list', () => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_TOTAL: '0' });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('::error::The API lists no commits that hotfix/crash adds over master; the hotfix cannot be checked.');
    expect(r.gh).toHaveLength(1);
  });

  it('more than 250 commits over master fail before the list is fetched', () => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_TOTAL: '251' });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('::error::hotfix/crash adds 251 commits over master (more than 250)');
    expect(r.gh).toHaveLength(1);
  });

  it('exactly 250 commits are checked (the limit is inclusive)', () => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', {
      FAKE_GH_TOTAL: '250',
      FAKE_GH_LIST: `${chain(250)}\n`,
      FAKE_GH_STATUS: 'diverged',
    });
    expect(r.status).toBe(0);
    expect(r.all).toContain('none of its 250 commits over master is on development');
    // A linear list has one root: total + list + one status call.
    expect(r.gh).toHaveLength(3);
  });

  it('a list shorter than the total (an incomplete page) fails before any status call', () => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_TOTAL: '2' });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('::error::hotfix/crash: The API listed 1 of the 2 commits the hotfix adds over master; it cannot be checked.');
    expect(r.gh).toHaveLength(2);
  });

  it.each([['null'], ['abc123'], ['HEAD'], [`${'a'.repeat(40)} *`]])('a list line %j fails before any status call', (line) => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_TOTAL: '1', FAKE_GH_LIST: `${line}\n` });
    expect(r.status).not.toBe(0);
    expect(r.all).toMatch(/::error::hotfix\/crash: The API listed '\S+' in the commits of the hotfix; it cannot be checked\./);
    expect(r.gh).toHaveLength(2);
  });

  const sha40 = (c: string) => c.repeat(40);
  it.each([
    ['a repeated line hides a missing commit', `${sha40('b')} ${sha40('0')}\n${sha40('b')} ${sha40('0')}\n${sha40('c')} ${sha40('b')} ${sha40('d')}\n`, '3', `listed ${sha40('b')} twice`],
    ['a commit is its own parent', `${sha40('b')} ${sha40('b')}\n`, '1', `listed ${sha40('b')}, which does not reach a root commit`],
    ['two commits name each other as parents', `${sha40('b')} ${sha40('c')}\n${sha40('c')} ${sha40('b')}\n`, '2', 'does not reach a root commit'],
    ['a cycle next to a good root', `${sha40('a')} ${sha40('0')}\n${sha40('b')} ${sha40('c')}\n${sha40('c')} ${sha40('b')}\n`, '3', 'does not reach a root commit'],
  ])('a list where %s fails before any status call (closed)', (_case, list, total, message) => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_TOTAL: total, FAKE_GH_LIST: list });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(message);
    expect(r.all).not.toContain('OK:');
    expect(r.gh).toHaveLength(2);
  });

  it('an empty list for a non-zero total names the count it got', () => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_TOTAL: '2', FAKE_GH_LIST: '' });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('The API listed 0 of the 2 commits the hotfix adds over master');
    expect(r.all).not.toContain('OK:');
    expect(r.gh).toHaveLength(2);
  });

  it('a cycle that a member leaves through a parent is checked through that root', () => {
    // b and c name each other, but b also has the root a: c and b reach a, so comparing a
    // covers them (development holding c would hold a too).
    const list = `${sha40('a')} ${sha40('0')}\n${sha40('b')} ${sha40('a')} ${sha40('c')}\n${sha40('c')} ${sha40('b')}\n`;
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_TOTAL: '3', FAKE_GH_LIST: list, FAKE_GH_STATUS: 'ahead' });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(`(${sha40('a')} is on development; compare status: ahead)`);
    expect(r.gh.filter((l) => l.endsWith('--jq .status'))).toHaveLength(1);
  });

  it.each([
    ['a cycle that a member leaves through a parent', `${sha40('a')} ${sha40('0')}\n${sha40('b')} ${sha40('a')} ${sha40('c')}\n${sha40('c')} ${sha40('b')}\n`, '3'],
    ['a commit that lists itself and a real root', `${sha40('a')} ${sha40('0')}\n${sha40('b')} ${sha40('b')} ${sha40('a')}\n`, '2'],
  ])('%s passes when its root is not on development', (_case, list, total) => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_TOTAL: total, FAKE_GH_LIST: list, FAKE_GH_STATUS: 'diverged' });
    expect(r.status).toBe(0);
    expect(r.all).toContain(`OK: hotfix/crash -> master (cut from master; none of its ${total} commits over master is on development)`);
    expect(r.gh.filter((l) => l.endsWith('--jq .status'))).toEqual([expect.stringContaining(`/compare/${sha40('a')}...development`)]);
  });

  it('only root commits are compared: a linear hotfix of two commits makes one status call', () => {
    branchFrom('hotfix/crash', 'master');
    repo.git(['switch', '-q', 'hotfix/crash']);
    repo.commit('fix: second part');
    repo.git(['switch', '-q', 'development']);
    const first = repo.git(['rev-parse', 'hotfix/crash~1']);
    const head = repo.git(['rev-parse', 'hotfix/crash']);
    const r = guard('hotfix/crash', 'hotfix/crash');
    expect(r.status).toBe(0);
    expect(r.all).toContain('none of its 2 commits over master is on development');
    expect(r.gh).toEqual([
      `gh api repos/tarodan/tarodan-mobile/compare/master...${head}?per_page=1 --jq .total_commits`,
      `gh api repos/tarodan/tarodan-mobile/compare/master...${head}?per_page=100 --paginate --jq .commits[] | ([.sha] + [.parents[].sha]) | join(" ")`,
      `gh api repos/tarodan/tarodan-mobile/compare/${first}...development?per_page=1 --jq .status`,
    ]);
  });

  it('every root is compared: a merged branch adds a root of its own', () => {
    // feat/side (cut from master, never on development) merged into the hotfix: two
    // roots, the fix and the side commit, and both are compared.
    const side = (() => {
      branchFrom('feat/side', 'master');
      return repo.git(['rev-parse', 'feat/side']);
    })();
    branchFrom('hotfix/crash', 'master');
    const fix = repo.git(['rev-parse', 'hotfix/crash']);
    repo.git(['switch', '-q', 'hotfix/crash']);
    repo.git(['merge', '-q', '--no-ff', '-m', 'Merge side', 'feat/side']);
    repo.git(['switch', '-q', 'development']);
    const r = guard('hotfix/crash', 'hotfix/crash');
    expect(r.status).toBe(0);
    const compared = r.gh.filter((l) => l.endsWith('--jq .status')).map((l) => l.split('/compare/')[1].split('...')[0]);
    expect(compared.sort()).toEqual([fix, side].sort());
  });

  // Two roots, compared in list order: r1 then r2 (m merges them).
  const [m, r1, r2] = [sha40('3'), sha40('1'), sha40('2')];
  const twoRoots = `${m} ${r1} ${r2}\n${r1} ${sha40('0')}\n${r2} ${sha40('0')}\n`;
  const statusCalls = (gh: string[]) => gh.filter((l) => l.endsWith('--jq .status')).map((l) => l.split('/compare/')[1].split('...')[0]);
  it.each([
    ['diverged', 'ahead', `(${r2} is on development; compare status: ahead)`],
    ['behind', 'identical', `(${r2} is on development; compare status: identical)`],
    ['diverged', 'unknown', `Could not tell whether development contains ${r2} (compare status: 'unknown')`],
    ['behind', 'FAIL', 'fake gh: HTTP 502'],
  ])('a later root fails the guard after an earlier root passed (%s, then %s)', (first, second, message) => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', {
      FAKE_GH_TOTAL: '3',
      FAKE_GH_LIST: twoRoots,
      [`FAKE_GH_STATUS_${r1}`]: first,
      [`FAKE_GH_STATUS_${r2}`]: second,
    });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(message);
    expect(r.all).not.toContain('OK:');
    expect(statusCalls(r.gh)).toEqual([r1, r2]);
  });

  it('the first root on development stops the guard before the next root is compared', () => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', {
      FAKE_GH_TOTAL: '3',
      FAKE_GH_LIST: twoRoots,
      [`FAKE_GH_STATUS_${r1}`]: 'ahead',
      [`FAKE_GH_STATUS_${r2}`]: 'diverged',
    });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(`(${r1} is on development; compare status: ahead)`);
    expect(statusCalls(r.gh)).toEqual([r1]);
  });

  it('two roots that development lacks (behind, diverged) pass after both are compared', () => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', {
      FAKE_GH_TOTAL: '3',
      FAKE_GH_LIST: twoRoots,
      [`FAKE_GH_STATUS_${r1}`]: 'behind',
      [`FAKE_GH_STATUS_${r2}`]: 'diverged',
    });
    expect(r.status).toBe(0);
    expect(r.all).toContain('OK: hotfix/crash -> master (cut from master; none of its 3 commits over master is on development)');
    expect(statusCalls(r.gh)).toEqual([r1, r2]);
  });

  it('a total too large for shell arithmetic still fails (closed), without a status call', () => {
    // bash `[ -gt ]` rejects it as "integer expression expected" (false, so neither the
    // zero nor the cap check fires); the list count check is what keeps it closed.
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_TOTAL: '99999999999999999999' });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain('::error::hotfix/crash: The API listed 1 of the 99999999999999999999 commits');
    expect(r.all).not.toContain('OK:');
    expect(statusCalls(r.gh)).toEqual([]);
  });

  it.each([[''], ['null'], ['unknown']])('a compare status %j fails (closed)', (status) => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_STATUS: status });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(`::error::Could not tell whether development contains`);
    expect(r.all).toContain(`(compare status: '${status}')`);
    expect(r.all).not.toContain('OK:');
  });

  it.each([['identical'], ['ahead']])('a compare status %j (development contains the commit) fails', (status) => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_STATUS: status });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(`is on development; compare status: ${status})`);
  });

  it.each([['behind'], ['diverged']])('a compare status %j (development lacks the commit) passes', (status) => {
    const r = guard(branchFrom('hotfix/crash', 'master'), 'hotfix/crash', { FAKE_GH_STATUS: status });
    expect(r.status).toBe(0);
    expect(r.all).toContain('OK: hotfix/crash -> master');
  });

  it('development passes without any API call', () => {
    const r = guard('development', 'development');
    expect(r.status).toBe(0);
    expect(r.gh).toEqual([]);
  });

  it.each([
    ['feat/x'],
    ['hotfix'],
    ['backmerge/crash-1'],
    ['master'],
    ['development2'],
    ['hotfix-crash'],
    ['Hotfix/crash'],
  ])('another source (%s) fails', (ref) => {
    const r = guard(ref, 'development');
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(`::error::A PR into master must come from 'development' or a 'hotfix/*' branch (source: '${ref}').`);
    expect(r.gh).toEqual([]);
  });

  it.each([['development'], ['hotfix/crash']])('a branch from a fork fails, even when named %s, without an API call', (ref) => {
    if (ref !== 'development') branchFrom(ref, 'master');
    const r = guard(ref, ref, { HEAD_REPO: 'someone/tarodan-mobile' });
    expect(r.status).not.toBe(0);
    expect(r.all).toContain(`::error::A PR into master must come from a branch of this repository (source: someone/tarodan-mobile:${ref}).`);
    expect(r.all).not.toContain('OK:');
    expect(r.gh).toEqual([]);
  });
});
