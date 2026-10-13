/**
 * Maestro Cloud workflow'u: flow'lar `appId: ${APP_ID}` kullandığı için action'a `env: APP_ID`
 * verilmeli (aksi halde Cloud'da hiçbir flow uygulamayı bulamaz). Değer `maestro/app-id.sh`'tan
 * gelir; build yoksa/secret eksikse workflow no-op kalır (guard).
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/maestro-cloud.yml'), 'utf8');

describe('maestro-cloud.yml APP_ID', () => {
  it("action'a env: APP_ID adım çıktısından geçer", () => {
    const action = yml.slice(yml.indexOf('uses: mobile-dev-inc/action-maestro-cloud'));
    expect(action).toMatch(/^\s+env: \|\n\s+APP_ID=\$\{\{ steps\.appid\.outputs\.value \}\}/m);
  });

  it('değer maestro/app-id.sh ios staging ile çözülür ve guard atlarsa adım da atlanır', () => {
    const step = yml.slice(yml.indexOf('id: appid'), yml.indexOf('- name: Run flows on Maestro Cloud'));
    expect(step).toContain('bash maestro/app-id.sh ios staging');
    expect(step).toMatch(/if: steps\.guard\.outputs\.skip == 'false'/);
  });

  it('guard (secret / build yoksa no-op) korunur ve action da guard\'a bağlı', () => {
    expect(yml).toContain('build/Tarodan.app yok — no-op.');
    const action = yml.slice(yml.indexOf('- name: Run flows on Maestro Cloud'));
    expect(action).toMatch(/if: steps\.guard\.outputs\.skip == 'false'/);
  });

  it('app-id.sh ios staging iOS EAS maestro build kimliğini verir (.staging)', () => {
    const res = spawnSync('bash', [path.join(ROOT, 'maestro/app-id.sh'), 'ios', 'staging'], {
      encoding: 'utf8',
      env: { ...process.env, APP_ID: '' },
    });
    expect(res.stdout.trim()).toBe('com.tarodan.app.staging');
  });
});
