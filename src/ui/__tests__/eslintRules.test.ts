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

describe('tarodan/no-custom-screen-header', () => {
  const rule = () => plugin.rules['no-custom-screen-header'];
  const run = (filename: string, visit: (v: any) => void) => {
    const reports: unknown[] = [];
    const v = rule().create({ filename, report: (r: unknown) => reports.push(r) });
    visit(v);
    return reports.length;
  };
  const insetsCall = { type: 'CallExpression', callee: { type: 'Identifier', name: 'useSafeAreaInsets' } };
  const member = (obj: any, prop: string) => ({
    type: 'MemberExpression',
    computed: false,
    object: obj,
    property: { type: 'Identifier', name: prop },
  });
  const attr = (name: string, value: any) => ({
    type: 'JSXAttribute',
    name: { name },
    value,
  });
  const jsx = (name: string, attributes: any[]) => ({
    type: 'JSXOpeningElement',
    name: { type: 'JSXIdentifier', name },
    attributes,
  });
  const SCREEN = '/repo/app/orders/index.tsx';

  it('insets.top (değişken, doğrudan çağrı ve destructuring)', () => {
    expect(
      run(SCREEN, (v) => {
        v.VariableDeclarator({ type: 'VariableDeclarator', id: { type: 'Identifier', name: 'insets' }, init: insetsCall });
        v.MemberExpression(member({ type: 'Identifier', name: 'insets' }, 'top'));
        v.MemberExpression(member({ type: 'Identifier', name: 'insets' }, 'bottom'));
      }),
    ).toBe(1);
    expect(run(SCREEN, (v) => v.MemberExpression(member(insetsCall, 'top')))).toBe(1);
    expect(
      run(SCREEN, (v) =>
        v.VariableDeclarator({
          type: 'VariableDeclarator',
          id: { type: 'ObjectPattern', properties: [{ type: 'Property', key: { type: 'Identifier', name: 'top' } }] },
          init: insetsCall,
        }),
      ),
    ).toBe(1);
  });

  it("SafeAreaView: edges içinde 'top' ya da edges yok → uyarı; yalnız bottom serbest", () => {
    const edges = (...e: string[]) =>
      attr('edges', {
        type: 'JSXExpressionContainer',
        expression: { type: 'ArrayExpression', elements: e.map((x) => ({ type: 'Literal', value: x })) },
      });
    expect(run(SCREEN, (v) => v.JSXOpeningElement(jsx('SafeAreaView', [])))).toBe(1);
    expect(run(SCREEN, (v) => v.JSXOpeningElement(jsx('SafeAreaView', [edges('top', 'bottom')])))).toBe(1);
    expect(run(SCREEN, (v) => v.JSXOpeningElement(jsx('SafeAreaView', [edges('bottom')])))).toBe(0);
  });

  it('elle geri ikonu (arrow-back / chevron-back); başka ikon serbest', () => {
    const icon = (n: string) => jsx('Ionicons', [attr('name', { type: 'Literal', value: n })]);
    expect(run(SCREEN, (v) => v.JSXOpeningElement(icon('arrow-back')))).toBe(1);
    expect(run(SCREEN, (v) => v.JSXOpeningElement(icon('chevron-back')))).toBe(1);
    expect(run(SCREEN, (v) => v.JSXOpeningElement(icon('close')))).toBe(0);
  });

  it('izinli dosyalar muaf (AuthShell, kapılar, @/ui, shell)', () => {
    for (const f of [
      '/repo/src/components/auth/AuthShell.tsx',
      '/repo/src/components/common/FullScreenGate.tsx',
      '/repo/src/components/common/GateScreen.tsx',
      '/repo/src/components/shell/AppShell.tsx',
      '/repo/src/ui/components/ScreenHeader.tsx',
      '/repo/app/product/[id]/_modals/ImageViewerModal.tsx',
    ]) {
      expect(run(f, (v) => v.JSXOpeningElement && v.JSXOpeningElement?.(jsx('SafeAreaView', [])))).toBe(0);
    }
  });
});

describe('tarodan/no-native-header', () => {
  const visit = (value: any) => {
    const reports: unknown[] = [];
    plugin.rules['no-native-header']
      .create({ report: (r: unknown) => reports.push(r) })
      .Property({ type: 'Property', key: { type: 'Identifier', name: 'headerShown' }, value });
    return reports.length;
  };
  it('headerShown: true yasak, false serbest', () => {
    expect(visit({ type: 'Literal', value: true })).toBe(1);
    expect(visit({ type: 'Literal', value: false })).toBe(0);
  });
});

describe('tarodan/empty-state-standard', () => {
  const el = (name: string, children: any[] = []) => ({
    type: 'JSXElement',
    openingElement: { name: { type: 'JSXIdentifier', name } },
    children,
  });
  const visit = (expression: any) => {
    const { reports, context } = makeContext();
    plugin.rules['empty-state-standard'].create(context).JSXAttribute({
      type: 'JSXAttribute',
      name: { type: 'JSXIdentifier', name: 'ListEmptyComponent' },
      value: { type: 'JSXExpressionContainer', expression },
    });
    return reports.length;
  };
  it('ListEmptyComponent içinde View/Text yasak; EmptyState ve sarmalayıcılar serbest', () => {
    expect(visit(el('View', [el('Text')]))).toBe(1);
    expect(visit(el('RawText'))).toBe(1);
    // Metinsiz View (iskelet) boş durum sayılmaz.
    expect(visit(el('View', [el('SkeletonText')]))).toBe(0);
    expect(visit(el('EmptyState'))).toBe(0);
    expect(visit(el('ProductListEmpty'))).toBe(0);
  });
  it('koşullu dallar taranır', () => {
    const cond = { type: 'ConditionalExpression', consequent: el('EmptyState'), alternate: el('Text') };
    expect(visit(cond)).toBe(1);
    expect(visit({ type: 'LogicalExpression', right: el('View', [el('Text')]) })).toBe(1);
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

describe('tarodan/no-inline-query-key', () => {
  const rule = () => {
    const { reports, context } = makeContext();
    return { reports, visitor: plugin.rules['no-inline-query-key'].create(context) };
  };
  const arr = (...elements: any[]) => ({ type: 'ArrayExpression', elements });
  const lit = (value: string) => ({ type: 'Literal', value });
  const ident = (name: string) => ({ type: 'Identifier', name });
  const member = (name: string) => ({ type: 'MemberExpression', object: ident(name), property: ident('all') });
  const prop = (key: string, value: any) => ({ type: 'Property', key: ident(key), value });
  const call = (method: string, args: any[]) => ({
    type: 'CallExpression',
    callee: { type: 'MemberExpression', object: ident('queryClient'), property: ident(method) },
    arguments: args,
  });

  it('queryKey / invalidates / setQueryData içindeki satır içi dizi uyarı verir', () => {
    const { reports, visitor } = rule();
    visitor.Property(prop('queryKey', arr(lit('sale-order'), ident('id'))));
    visitor.Property(prop('queryKey', arr({ type: 'SpreadElement', argument: member('qk') }, lit('x'))));
    visitor.Property(prop('invalidates', arr(member('qk'), arr(lit('refund-requests')))));
    visitor.CallExpression(call('setQueryData', [arr(lit('collection')), ident('fn')]));
    expect(reports).toHaveLength(4);
  });

  it('qk ifadeleri, değişkenler ve ilgisiz diziler serbest', () => {
    const { reports, visitor } = rule();
    visitor.Property(prop('queryKey', member('qk')));
    visitor.Property(prop('queryKey', ident('searchKey')));
    visitor.Property(prop('invalidates', arr(member('qk'))));
    visitor.Property(prop('items', arr(lit('a'))));
    visitor.CallExpression(call('setQueryData', [member('qk'), ident('fn')]));
    visitor.CallExpression(call('includes', [arr(lit('a'))]));
    expect(reports).toHaveLength(0);
  });
});

describe('tarodan/encoded-api-path', () => {
  const ident = (name: string) => ({ type: 'Identifier', name });
  const lit = (value: string) => ({ type: 'Literal', value });
  const tpl = (exprCount: number) => ({
    type: 'TemplateLiteral',
    quasis: [],
    expressions: Array.from({ length: exprCount }, (_, i) => ident(`v${i}`)),
  });
  const tagged = (tag: string) => ({ type: 'TaggedTemplateExpression', tag: ident(tag), quasi: tpl(1) });
  const plus = (left: any, right: any) => ({ type: 'BinaryExpression', operator: '+', left, right });
  const call = (object: any, method: string, url: any) => ({
    type: 'CallExpression',
    callee: { type: 'MemberExpression', computed: false, object, property: ident(method) },
    arguments: [url],
  });
  const visit = (node: any) => {
    const { reports, context } = makeContext();
    plugin.rules['encoded-api-path'].create(context).CallExpression(node);
    return reports.length;
  };

  it('api/guestApi/…Http() çağrısında interpolasyonlu şablon ya da dinamik birleştirme uyarı verir', () => {
    expect(visit(call(ident('api'), 'post', tpl(1)))).toBe(1);
    expect(visit(call(ident('guestApi'), 'get', tpl(2)))).toBe(1);
    expect(visit(call(ident('api'), 'delete', plus(lit('/trades/'), ident('id'))))).toBe(1);
    expect(visit(call(ident('api'), 'patch', plus(plus(lit('/a/'), ident('id')), lit('/b'))))).toBe(1);
    const paymentHttp = { type: 'CallExpression', callee: ident('paymentHttp'), arguments: [ident('id')] };
    expect(visit(call(paymentHttp, 'post', tpl(1)))).toBe(1);
  });

  it('apiPath etiketli şablon, sabit yol, interpolasyonsuz şablon ve ilgisiz çağrılar serbest', () => {
    expect(visit(call(ident('api'), 'post', tagged('apiPath')))).toBe(0);
    expect(visit(call(ident('api'), 'get', lit('/trades')))).toBe(0);
    expect(visit(call(ident('api'), 'get', tpl(0)))).toBe(0);
    expect(visit(call(ident('api'), 'get', plus(lit('/a'), lit('/b'))))).toBe(0);
    expect(visit(call(ident('map'), 'get', tpl(1)))).toBe(0);
    expect(visit(call(ident('api'), 'getUri', tpl(1)))).toBe(0);
  });
});
