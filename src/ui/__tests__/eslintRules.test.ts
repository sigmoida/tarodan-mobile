/**
 * Yerel tasarım lint kuralları (eslint-plugin-tarodan) — dalga 1'de uyarı seviyesinde.
 *
 * ESLint'in RuleTester'ı ve TS parser'ı jest-expo ortamında yüklenemiyor/çok yavaş; kuralların
 * ziyaretçilerini elle kurulmuş küçük AST düğümleriyle çağırıyoruz. (Uçtan uca doğrulama:
 * `pnpm lint` çıktısındaki tarodan/* uyarıları.)
 */
/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
const plugin = require('eslint-plugin-tarodan');

function makeContext() {
  const reports: unknown[] = [];
  return {
    reports,
    context: {
      report: (r: unknown) => reports.push(r),
      sourceCode: { getText: (n: any) => String(n.value) },
    },
  };
}

/** `StyleSheet.create({ a: { [key]: value } })` içindeki Property düğümü. */
function styleProp(key: string, value: any) {
  const call: any = {
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'StyleSheet' },
      property: { type: 'Identifier', name: 'create' },
    },
    parent: null,
  };
  const outer: any = { type: 'ObjectExpression', parent: call };
  const prop: any = { type: 'Property', key: { type: 'Identifier', name: key }, value, parent: outer };
  return prop;
}

describe('tarodan/no-raw-style-values', () => {
  const visit = (prop: any) => {
    const { reports, context } = makeContext();
    plugin.rules['no-raw-style-values'].create(context).Property(prop);
    return reports.length;
  };

  it('StyleSheet içindeki ham fontSize/fontWeight/borderRadius/lineHeight', () => {
    expect(visit(styleProp('fontSize', { type: 'Literal', value: 13 }))).toBe(1);
    expect(visit(styleProp('fontWeight', { type: 'Literal', value: '600' }))).toBe(1);
    expect(visit(styleProp('borderRadius', { type: 'Literal', value: 12 }))).toBe(1);
    expect(visit(styleProp('lineHeight', { type: 'Literal', value: 18 }))).toBe(1);
  });

  it('token ifadesi, başka anahtar ve StyleSheet dışı nesne serbest', () => {
    expect(visit(styleProp('fontSize', { type: 'MemberExpression' }))).toBe(0);
    expect(visit(styleProp('padding', { type: 'Literal', value: 12 }))).toBe(0);
    const loose = styleProp('fontSize', { type: 'Literal', value: 13 });
    loose.parent = { type: 'ObjectExpression', parent: null };
    expect(visit(loose)).toBe(0);
  });
});

describe('tarodan/no-lira-symbol', () => {
  const visitors = () => {
    const ctx = makeContext();
    return { v: plugin.rules['no-lira-symbol'].create(ctx.context), reports: ctx.reports };
  };

  it('string, şablon ve JSX metnindeki ₺', () => {
    const { v, reports } = visitors();
    v.Literal({ type: 'Literal', value: '₺' });
    v.TemplateElement({ type: 'TemplateElement', value: { cooked: ' ₺' } });
    v.JSXText({ type: 'JSXText', value: '₺' });
    v.Literal({ type: 'Literal', value: '1.234,50 TL' });
    v.Literal({ type: 'Literal', value: 42 });
    expect(reports).toHaveLength(3);
  });
});

describe('tarodan/restrict-button-icon', () => {
  const attr = (name: string, value: any) => ({
    type: 'JSXAttribute',
    name: { type: 'JSXIdentifier', name },
    value,
  });
  const visit = (tag: string, attrs: any[]) => {
    const { reports, context } = makeContext();
    plugin.rules['restrict-button-icon']
      .create(context)
      .JSXOpeningElement({ type: 'JSXOpeningElement', name: { type: 'JSXIdentifier', name: tag }, attributes: attrs });
    return reports.length;
  };
  const lit = (value: string) => ({ type: 'Literal', value });

  it('izinli işlev ikonları serbest', () => {
    expect(visit('Button', [attr('icon', lit('share'))])).toBe(0);
    expect(visit('Button', [attr('icon', { type: 'JSXExpressionContainer', expression: lit('funnel') })])).toBe(0);
  });

  it('izin dışı ad, sabit olmayan değer ve leftIcon/rightIcon uyarı verir', () => {
    expect(visit('Button', [attr('icon', lit('sparkles'))])).toBe(1);
    expect(visit('Button', [attr('icon', { type: 'JSXExpressionContainer', expression: { type: 'Identifier', name: 'x' } })])).toBe(1);
    expect(visit('Button', [attr('leftIcon', null)])).toBe(1);
    expect(visit('Button', [attr('rightIcon', null)])).toBe(1);
  });

  it('Button dışındaki bileşenlere dokunmaz', () => {
    expect(visit('IconButton', [attr('icon', lit('sparkles'))])).toBe(0);
    expect(visit('Input', [attr('rightIcon', null)])).toBe(0);
  });
});
