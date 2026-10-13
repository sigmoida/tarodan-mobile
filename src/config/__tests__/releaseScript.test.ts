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

describe('release.sh plan — bekleyen build için OTA da ikinci build de yok', () => {
  it('staging: derlenen build varken → wait + uyarı', () => {
    const r = plan('staging', { env: { PLATFORM: 'ios' }, builds: [build({ id: 'b1', status: 'IN_PROGRESS' })] });
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

  it('recheck staging: arada başlamış build → skip (OTA da yok)', () => {
    const r = run(['recheck', 'ios', 'staging'], {
      env: { FP: 'fp-ios-preview' },
      builds: [build({ id: 'b1', status: 'IN_QUEUE' })],
    });
    expect(r.outputs.action).toBe('skip');
  });
});

describe('release.sh plan — VERSION-GATE platform başına', () => {
  const ANDROID = { ANDROID_ENABLED: 'true' };
  // iOS: native değişti (bu runtime için build yok), son production build'i 1.0.5
  // = app.json sürümü → kapı takılır. Android: binary var → OTA.
  const iosOld = build({ id: 'ios-old', profile: 'production', runtime: 'eski', appVersion: '9.9.9' });
  const and = shipped('and-1', { platform: 'ANDROID', profile: 'production' });

  it('iOS kapısı takılırsa iOS blocked, Android OTA yine çıkar', () => {
    const r = plan('production', { env: ANDROID, builds: [iosOld, and.b], submissions: [and.s] });
    expect(r.status).toBe(0);
    expect(r.outputs).toMatchObject({
      ios: 'blocked',
      android: 'ota',
      ota_matrix: '[{"platform":"android","fp":"fp-android-production"}]',
      blocked: 'ios',
      decided: 'true',
    });
    expect(r.all).toContain('::error::ios: native değişti');
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
    expect(r.all).toContain('::warning::ios: native değişti');
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
