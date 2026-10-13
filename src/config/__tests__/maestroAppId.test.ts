/**
 * Maestro uygulama kimliği sözleşmesi.
 *
 * EAS `maestro` profili preview'dan türer; iOS'ta `.staging` ekli bundle id
 * (`com.tarodan.app.staging`) üretir, Android paketi aynı kalır. Flow'lar sabit
 * `com.tarodan.app` yazarsa o build'e hiç bağlanamaz. Bu yüzden tüm flow/subflow
 * `appId: ${APP_ID}` kullanır ve değeri `maestro/app-id.sh` sağlar.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const MAESTRO = path.join(ROOT, 'maestro');
const { expo } = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')) as {
  expo: { ios: { bundleIdentifier: string }; android: { package: string } };
};

const yamlFiles = (dir: string): string[] =>
  fs.readdirSync(path.join(MAESTRO, dir)).filter((f) => f.endsWith('.yaml')).map((f) => `${dir}/${f}`);
const flowFiles = [...yamlFiles('flows'), ...yamlFiles('subflows')];

const appId = (platform?: string, target?: string, env: Record<string, string> = {}) => {
  const args = [path.join(MAESTRO, 'app-id.sh'), ...(platform ? [platform] : []), ...(target ? [target] : [])];
  const res = spawnSync('bash', args, {
    encoding: 'utf8',
    env: { ...process.env, APP_ID: undefined, ...env },
  });
  return { out: res.stdout.trim(), code: res.status, err: res.stderr };
};

describe('maestro flow\'ları — appId parametrik', () => {
  it('flow ve subflow dosyası bulundu', () => {
    expect(flowFiles.length).toBeGreaterThan(50);
  });

  it.each(flowFiles)('%s: sabit paket/bundle id yok', (file) => {
    const text = fs.readFileSync(path.join(MAESTRO, file), 'utf8');
    // Yorum satırları hariç: yalnız çalışan YAML'da sabit id aranır.
    const code = text.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
    expect(code).not.toMatch(/com\.tarodan\.app/);
    expect(code).not.toMatch(/host\.exp\.Exponent/);
  });

  it.each(flowFiles)('%s: başlıkta appId: ${APP_ID}', (file) => {
    const text = fs.readFileSync(path.join(MAESTRO, file), 'utf8');
    expect(text).toMatch(/^appId: \$\{APP_ID\}$/m);
  });

  it('launchApp içindeki appId de parametrik', () => {
    const text = fs.readFileSync(path.join(MAESTRO, 'subflows/open-tarodan.yaml'), 'utf8');
    expect(text).toMatch(/launchApp:\n\s+appId: \$\{APP_ID\}/);
  });

  it('flow başlıkları inline APP_ID varsayılanı taşımaz (Maestro\'da --env\'i ezer)', () => {
    for (const file of flowFiles) {
      const text = fs.readFileSync(path.join(MAESTRO, file), 'utf8');
      expect(text).not.toMatch(/^\s+APP_ID:/m);
    }
  });
});

describe('maestro/app-id.sh', () => {
  it('varsayılan (yerel dev akışı) com.tarodan.app — eski davranış', () => {
    expect(appId().out).toBe(expo.android.package);
    expect(appId('ios', 'dev').out).toBe(expo.ios.bundleIdentifier);
    expect(appId('android', 'dev').out).toBe(expo.android.package);
  });

  it('iOS staging: app.config.js\'in preview bundle id\'si', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const withVariant = require('../../../app.config') as (a: { config: unknown }) => {
      ios: { bundleIdentifier: string };
      android: { package: string };
    };
    const prev = process.env.EXPO_PUBLIC_ENVIRONMENT;
    process.env.EXPO_PUBLIC_ENVIRONMENT = 'preview';
    let preview;
    try {
      preview = withVariant({ config: expo });
    } finally {
      if (prev === undefined) delete process.env.EXPO_PUBLIC_ENVIRONMENT;
      else process.env.EXPO_PUBLIC_ENVIRONMENT = prev;
    }
    expect(appId('ios', 'staging').out).toBe(preview.ios.bundleIdentifier);
    expect(appId('ios', 'staging').out).toBe('com.tarodan.app.staging');
    expect(appId('android', 'staging').out).toBe(preview.android.package);
  });

  it('APP_ID ortam değişkeni her şeyi ezer', () => {
    expect(appId('ios', 'staging', { APP_ID: 'com.ornek.app' }).out).toBe('com.ornek.app');
  });

  it('bilinmeyen hedef hata verir (sessizce yanlış id seçmez)', () => {
    const res = appId('ios', 'prod');
    expect(res.code).toBe(2);
    expect(res.out).toBe('');
  });
});

describe('maestro/run.sh ve config.yaml', () => {
  const run = fs.readFileSync(path.join(MAESTRO, 'run.sh'), 'utf8');
  const config = fs.readFileSync(path.join(MAESTRO, 'config.yaml'), 'utf8');

  it('run.sh APP_ID\'yi app-id.sh\'tan alıp maestro\'ya --env ile geçirir', () => {
    expect(run).toContain('app-id.sh');
    expect(run).toMatch(/MAESTRO_TARGET="\$\{MAESTRO_TARGET:-dev\}"/);
    expect(run).toMatch(/exec maestro test --env APP_ID="\$APP_ID"/);
  });

  it('config.yaml sabit appId değil, APP_ID varsayılanı taşır', () => {
    expect(config).not.toMatch(/^appId:/m);
    expect(config).toMatch(/^\s+APP_ID: com\.tarodan\.app$/m);
  });
});
