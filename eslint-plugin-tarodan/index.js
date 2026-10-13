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

module.exports = {
  rules: {
    'no-raw-style-values': noRawStyleValues,
    'no-lira-symbol': noLiraSymbol,
  },
};
