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

const ROOT = path.resolve(__dirname, '../../..');
const SCRIPT = path.join(ROOT, 'scripts/ci/release.sh');
const FAKES = path.join(ROOT, 'scripts/ci/__fakes__');

type Build = Record<string, unknown>;
type Submission = Record<string, unknown>;

type EasJson = { build: Record<string, { channel?: string; env?: Record<string, string> }> } & Record<string, unknown>;
const realEasJson = (): EasJson => JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));

const TODAY = new Date().toISOString().slice(0, 10);

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
    appVersion: o.appVersion ?? '1.0.5',
    appIdentifier: o.appIdentifier ?? (env === 'production' ? 'com.tarodan.app' : 'com.tarodan.app.staging'),
    runtime: { id: `rt-${runtime}`, version: runtime },
    runtimeVersion: runtime, // eski eas-cli alanı (geçici)
    fingerprint: { id: `f-${runtime}`, hash: runtime },
    updateChannel: { id: 'c', name: o.channel ?? (profile === 'production' ? 'production' : 'staging') },
    createdAt: o.createdAt ?? `${TODAY}T00:00:00.000Z`,
    ...(o.message ? { message: o.message } : {}),
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
  /** eas.json'u değiştirerek koş (script geçici bir kök dizine kopyalanır). */
  easJson?: (eas: EasJson) => EasJson | string;
  builds?: Build[];
  submissions?: Submission[];
  buildResult?: unknown;
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

  // Runner'dan sızabilecek değişkenleri temizle; testler kendi env'ini verir.
  const base = { ...process.env };
  for (const k of Object.keys(base)) {
    if (k.startsWith('EXPO_PUBLIC_') || k.startsWith('GITHUB_')) delete base[k];
  }
  for (const k of ['MODE', 'PLATFORM', 'ANDROID_ENABLED', 'COMMIT_MSG', 'SHA', 'FP']) delete base[k];

  let script = SCRIPT;
  if (opts.easJson) {
    const root = path.join(dir, 'root');
    fs.mkdirSync(path.join(root, 'scripts/ci'), { recursive: true });
    script = path.join(root, 'scripts/ci/release.sh');
    fs.copyFileSync(SCRIPT, script);
    fs.copyFileSync(path.join(ROOT, 'app.json'), path.join(root, 'app.json'));
    const eas = opts.easJson(realEasJson());
    fs.writeFileSync(path.join(root, 'eas.json'), typeof eas === 'string' ? eas : JSON.stringify(eas));
  }

  const res = spawnSync('bash', [script, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...base,
      PATH: `${FAKES}:${process.env.PATH}`,
      FAKE_DIR: dir,
      GITHUB_OUTPUT: outFile,
      GITHUB_STEP_SUMMARY: summaryFile,
      ...opts.env,
    },
  });
  const outputs: Record<string, string> = {};
  for (const line of fs.readFileSync(outFile, 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) outputs[line.slice(0, i)] = line.slice(i + 1);
  }
  const log = fs.readFileSync(path.join(dir, 'log'), 'utf8').split('\n').filter(Boolean);
  const result = {
    status: res.status,
    stdout: res.stdout,
    stderr: res.stderr,
    all: `${res.stdout}\n${res.stderr}`,
    outputs,
    log,
    summary: fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, 'utf8') : '',
    easCalls: (cmd: string) => log.filter((l) => l.startsWith(`eas ${cmd} `)),
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
    const r = plan('production', { builds: [build({ id: 'p', profile: 'production' })], submissions: [submission('p')] });
    expect(r.outputs.android).toBe('skip');
    expect(r.outputs.ios).toBe('ota');
    expect(r.easCalls('build:list').every((l) => l.includes('--platform ios'))).toBe(true);
  });

  it('ota_platform: iki platform OTA ise all', () => {
    const ios = shipped('i');
    const and = shipped('a', { platform: 'ANDROID' });
    const r = plan('staging', {
      env: { ANDROID_ENABLED: 'true' },
      builds: [ios.b, and.b],
      submissions: [ios.s, and.s],
    });
    expect(r.outputs.ota_platform).toBe('all');
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
  const ota = (branch: string, profile: string, opts: RunOpts = {}) =>
    run(['publish-ota', branch, 'all', profile, 'msg'], opts);

  it('production OTA eas.json\'daki production env\'iyle yayınlanır', () => {
    const r = ota('production', 'production');
    expect(r.status).toBe(0);
    expect(r.easCalls('update')).toEqual([
      expect.stringContaining(
        '--branch production --platform all --message msg --non-interactive | EXPO_PUBLIC_ENVIRONMENT=production EXPO_PUBLIC_API_URL=https://tarodan.com.tr/api',
      ),
    ]);
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

  it('fingerprint de boş env ile hesaplanmaz (yanlış runtime → gereksiz build)', () => {
    const r = plan('staging', { easJson: withEnv('staging', { EXPO_PUBLIC_ENVIRONMENT: undefined }) });
    expect(r.status).not.toBe(0);
    expect(r.log.some((l) => l.includes('fingerprint:generate'))).toBe(false);
  });
});
