/**
 * @jest-environment node
 */
/**
 * `tarodan/no-whole-store-subscription` — argümansız `use*Store()` çağrısını yakalar
 * (tüm store'a abone: her yazımda render). Selector'lı ve `getState()` kullanımı temiz.
 *
 * ESLint jest-expo ortamında (RN polyfill'leri) yüklenemediği için kural ayrı bir node
 * süreciyle `Linter` üzerinden çalıştırılır.
 */
import { execFileSync } from 'child_process';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

const RUNNER = `
const { Linter } = require('eslint');
const plugin = require(process.argv[1]);
const linter = new Linter();
linter.defineRule('w', plugin.rules['no-whole-store-subscription']);
const cases = JSON.parse(process.argv[2]);
const out = cases.map((code) =>
  linter
    .verify(code, { parserOptions: { ecmaVersion: 2022, sourceType: 'module' }, rules: { w: 'warn' } })
    .map((m) => m.message),
);
process.stdout.write(JSON.stringify(out));
`;

function lint(cases: string[]): string[][] {
  const out = execFileSync(
    'node',
    ['-e', RUNNER, path.join(ROOT, 'eslint-plugin-tarodan'), JSON.stringify(cases)],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return JSON.parse(out);
}

describe('tarodan/no-whole-store-subscription', () => {
  it('selector, useShallow, getState ve useSyncExternalStore temiz', () => {
    const results = lint([
      'const user = useAuthStore((s) => s.user);',
      'const { a, b } = useCartStore(useShallow((s) => ({ a: s.a, b: s.b })));',
      'const items = useCartStore.getState().items;',
      'const snap = useSyncExternalStore(subscribe, getSnapshot);',
      'const x = useThing();',
    ]);
    expect(results).toEqual([[], [], [], [], []]);
  });

  it('argümansız use*Store() çağrılarını işaretler', () => {
    const results = lint([
      'const { user } = useAuthStore();',
      'const store = useCartStore();',
      'const l = useGuestStore().productViewCount;',
    ]);
    for (const messages of results) {
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/tüm store'a abone/);
    }
  });
});
