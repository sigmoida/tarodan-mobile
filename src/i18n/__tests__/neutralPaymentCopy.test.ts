/**
 * User-facing copy never names the payment provider (frontend-fixes spec, item 2). Only the
 * admin strings keep it (the app never renders `admin.*`), plus key NAMES that are not shown.
 * The dead provider keys stay deleted, the same set as the web catalog.
 */
import tr from '@/i18n/lib/catalog/tr.json';
import en from '@/i18n/lib/catalog/en.json';

type Tree = { [key: string]: string | Tree };

function leaves(node: Tree, prefix = ''): [string, string][] {
  return Object.entries(node).flatMap(([k, v]) =>
    typeof v === 'string' ? [[`${prefix}${k}`, v] as [string, string]] : leaves(v, `${prefix}${k}.`),
  );
}

const DELETED = [
  'checkout.payWithPaytr',
  'checkout.paytrRedirectNotice',
  'checkout.paytrNotice',
  'payment.cardsVaultNotice',
  'payment.provider',
];

describe.each([
  ['tr', tr],
  ['en', en],
])('%s catalog', (_lang, catalog) => {
  const entries = leaves(catalog as unknown as Tree);

  it('no value outside admin.* mentions PayTR', () => {
    const hits = entries.filter(([key, value]) => !key.startsWith('admin.') && /paytr/i.test(value));
    expect(hits).toEqual([]);
  });

  it('the dead provider keys are gone', () => {
    const keys = new Set(entries.map(([key]) => key));
    for (const key of DELETED) expect(keys.has(key)).toBe(false);
  });
});
