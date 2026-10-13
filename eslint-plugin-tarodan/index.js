/**
 * Tarodan mobil — yerel ESLint kuralları (tasarım token disiplini).
 *
 * Neden ayrı eklenti: çekirdek `no-restricted-syntax` renk yasakları için ZATEN `error`
 * seviyesinde; aynı kural iki ayrı seviyede (hata + uyarı) çalışamaz. Buradaki kurallar dalga
 * 1'de UYARI olarak açılır, dalga 2 ekranları temizleyince hataya çevrilir.
 */

/** `StyleSheet.create({...})` çağrısının içinde mi? */
function insideStyleSheetCreate(node) {
  for (let cur = node.parent; cur; cur = cur.parent) {
    if (
      cur.type === 'CallExpression' &&
      cur.callee.type === 'MemberExpression' &&
      cur.callee.object.type === 'Identifier' &&
      cur.callee.object.name === 'StyleSheet' &&
      cur.callee.property.type === 'Identifier' &&
      cur.callee.property.name === 'create'
    ) {
      return true;
    }
  }
  return false;
}

const RAW_STYLE_KEYS = new Set([
  'fontSize',
  'fontWeight',
  'lineHeight',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
]);

const TOKEN_HINT = {
  fontSize: 'theme.typography.fontSize.*',
  fontWeight: 'theme.typography.fontWeight.*',
  lineHeight: 'fontSize × theme.typography.lineHeight.*',
  borderRadius: 'theme.radiusRole.* / theme.radius.*',
};

/** @type {import('eslint').Rule.RuleModule} */
const noRawStyleValues = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "StyleSheet'te sayısal fontSize/lineHeight/borderRadius ve sabit fontWeight yerine token kullan",
    },
    schema: [],
    messages: {
      raw: "Ham '{{key}}: {{value}}' — token kullan ({{hint}}). Bkz. CLAUDE.md §2.",
    },
  },
  create(context) {
    return {
      Property(node) {
        const key =
          node.key.type === 'Identifier'
            ? node.key.name
            : node.key.type === 'Literal'
              ? String(node.key.value)
              : null;
        if (!key || !RAW_STYLE_KEYS.has(key)) return;
        const v = node.value;
        const isRaw =
          (v.type === 'Literal' && (typeof v.value === 'number' || typeof v.value === 'string')) ||
          (v.type === 'UnaryExpression' && v.argument.type === 'Literal');
        if (!isRaw) return;
        if (!insideStyleSheetCreate(node)) return;
        const hint = TOKEN_HINT[key] ?? TOKEN_HINT.borderRadius;
        context.report({
          node: v,
          messageId: 'raw',
          data: { key, value: context.sourceCode.getText(v), hint },
        });
      },
    };
  },
};

/** @type {import('eslint').Rule.RuleModule} */
const noLiraSymbol = {
  meta: {
    type: 'suggestion',
    docs: { description: "Metinde '₺' yerine formatPrice ('1.234,50 TL') kullan" },
    schema: [],
    messages: {
      lira: "'₺' sembolü — fiyatı formatPrice ile yaz ('1.234,50 TL', web ile aynı).",
    },
  },
  create(context) {
    const check = (node, text) => {
      if (typeof text === 'string' && text.includes('₺')) {
        context.report({ node, messageId: 'lira' });
      }
    };
    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value && node.value.cooked);
      },
      JSXText(node) {
        check(node, node.value);
      },
    };
  },
};

/**
 * Üst bar / güvenli alan disiplini: ekranlar ve komponentler kendi üst barını çizmez.
 * Üst bar YALNIZ `ScreenHeader` / `PageShell` (yığın), `AppShell` (sekme kökü) ile gelir; güvenli
 * alan üst boşluğu `useHeaderTopInset()` (tek formül). Bu kural şunları yakalar:
 *   (a) `useSafeAreaInsets()` sonucundan `.top` / `{ top }` okumak,
 *   (b) `<SafeAreaView>` ile `edges` içinde 'top' (ya da `edges` vermeden: tüm kenarlar),
 *   (c) elle çizilmiş geri ikonu (`Ionicons name="arrow-back" | "chevron-back"`).
 * Özel kabuklar (AuthShell, kapı ekranları, görsel görüntüleyici, tab/üst bar altyapısı)
 * aşağıdaki listede muaftır.
 */
const CUSTOM_HEADER_ALLOWED = [
  '/src/ui/',
  '/src/components/shell/',
  '/src/components/auth/AuthShell.tsx',
  '/src/components/common/FullScreenGate.tsx',
  '/src/components/common/GateScreen.tsx',
  '/app/product/[id]/_modals/ImageViewerModal.tsx',
];

function isAllowedCustomHeaderFile(filename) {
  const f = String(filename || '').replace(/\\/g, '/');
  return CUSTOM_HEADER_ALLOWED.some((a) => f.includes(a));
}

/** @type {import('eslint').Rule.RuleModule} */
const noCustomScreenHeader = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Ekranda elle üst bar / güvenli alan üst boşluğu / geri ikonu yerine ScreenHeader, PageShell, AppShell ve useHeaderTopInset kullan',
    },
    schema: [],
    messages: {
      insetsTop:
        "Doğrudan 'insets.top' — güvenli alan üst boşluğu için useHeaderTopInset() (@/ui) kullan; üst bar için ScreenHeader/PageShell/AppShell. Bkz. CLAUDE.md §14.",
      safeAreaTop:
        "<SafeAreaView> üst kenarı ('top' ya da edges verilmemiş) — üst bar ve güvenli alanı PageShell/AppShell verir; yalnız alt kenar için edges={['bottom']}.",
      backIcon:
        "Elle çizilmiş geri ikonu ('{{name}}') — PageShell/ScreenHeader geri okunu (chevron-back, tek tip) kullan.",
    },
  },
  create(context) {
    const filename = context.filename || (context.getFilename && context.getFilename());
    if (isAllowedCustomHeaderFile(filename)) return {};
    const insetsNames = new Set();
    const isInsetsCall = (n) =>
      n &&
      n.type === 'CallExpression' &&
      n.callee.type === 'Identifier' &&
      n.callee.name === 'useSafeAreaInsets';
    return {
      VariableDeclarator(node) {
        if (!isInsetsCall(node.init)) return;
        if (node.id.type === 'Identifier') {
          insetsNames.add(node.id.name);
        } else if (node.id.type === 'ObjectPattern') {
          for (const p of node.id.properties) {
            if (
              p.type === 'Property' &&
              p.key.type === 'Identifier' &&
              p.key.name === 'top'
            ) {
              context.report({ node: p, messageId: 'insetsTop' });
            }
          }
        }
      },
      MemberExpression(node) {
        if (node.computed || node.property.type !== 'Identifier' || node.property.name !== 'top') {
          return;
        }
        const o = node.object;
        if ((o.type === 'Identifier' && insetsNames.has(o.name)) || isInsetsCall(o)) {
          context.report({ node, messageId: 'insetsTop' });
        }
      },
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (name === 'SafeAreaView') {
          const edges = node.attributes.find(
            (a) => a.type === 'JSXAttribute' && a.name.name === 'edges',
          );
          if (!edges) {
            context.report({ node, messageId: 'safeAreaTop' });
            return;
          }
          const v = edges.value && edges.value.type === 'JSXExpressionContainer' ? edges.value.expression : null;
          if (
            v &&
            v.type === 'ArrayExpression' &&
            v.elements.some((e) => e && e.type === 'Literal' && e.value === 'top')
          ) {
            context.report({ node: edges, messageId: 'safeAreaTop' });
          }
        } else if (name === 'Ionicons') {
          const attr = node.attributes.find(
            (a) => a.type === 'JSXAttribute' && a.name.name === 'name',
          );
          const val = attr && attr.value;
          const lit =
            val && val.type === 'Literal'
              ? val.value
              : val && val.type === 'JSXExpressionContainer' && val.expression.type === 'Literal'
                ? val.expression.value
                : null;
          if (lit === 'arrow-back' || lit === 'chevron-back') {
            context.report({ node: attr, messageId: 'backIcon', data: { name: String(lit) } });
          }
        }
      },
    };
  },
};

/** @type {import('eslint').Rule.RuleModule} */
const noNativeHeader = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Native stack header açılmaz: headerShown: true yasak' },
    schema: [],
    messages: {
      native:
        "'headerShown: true' — native header kullanılmaz; üst bar ScreenHeader/PageShell ile çizilir (başlık/geri/yükseklik her ekranda aynı olsun).",
    },
  },
  create(context) {
    return {
      Property(node) {
        const key =
          node.key.type === 'Identifier'
            ? node.key.name
            : node.key.type === 'Literal'
              ? String(node.key.value)
              : null;
        if (key !== 'headerShown') return;
        if (node.value.type === 'Literal' && node.value.value === true) {
          context.report({ node: node.value, messageId: 'native' });
        }
      },
    };
  },
};

module.exports = {
  rules: {
    'no-raw-style-values': noRawStyleValues,
    'no-lira-symbol': noLiraSymbol,
    'no-custom-screen-header': noCustomScreenHeader,
    'no-native-header': noNativeHeader,
  },
};
