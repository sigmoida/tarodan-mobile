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
 * Düğmede ikon istisnadır: yalnız işlev ikonları (paylaş, favori, sepet, filtre, sırala, ekle,
 * geri/kapat, arama). Marka logoları (Google/Apple) `leftIcon` düğümüyle verilir ve satır
 * üstü `eslint-disable-next-line tarodan/restrict-button-icon` ile istisna işaretlenir. Bu listede olmayan `icon="..."`,
 * her `leftIcon` / `rightIcon` ve dinamik `icon={...}` UYARI verir (dalga 3, CLAUDE.md §14).
 */
const BUTTON_ICON_ALLOWED = new Set([
  'share',
  'heart',
  'shopping-cart',
  'shopping-bag',
  'funnel',
  'arrows-up-down',
  'plus',
  'check',
  'x-mark',
  'arrow-left',
  'chevron-left',
  'magnifying-glass',
]);

/** Sabit dizge ya da `cond ? 'a' : 'b'` (iç içe) -> Literal listesi; başka ifade -> null. */
function literalsOf(expr) {
  if (!expr) return null;
  if (expr.type === 'Literal') return [expr];
  if (expr.type === 'ConditionalExpression') {
    const a = literalsOf(expr.consequent);
    const b = literalsOf(expr.alternate);
    return a && b ? [...a, ...b] : null;
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
const restrictButtonIcon = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Button ikon prop\'ları yalnız izinli işlev ikonları için' },
    schema: [],
    messages: {
      icon: "Button'da dekoratif ikon yok — '{{name}}' izinli listede değil (paylaş, favori, sepet, filtre, sırala, ekle, geri/kapat). Bkz. CLAUDE.md §14.",
      slot: "Button'a '{{prop}}' ile ikon düğümü verme; izinli işlev ikonları için 'icon=\"...\"' kullan.",
      dynamic: "Button 'icon' değeri sabit değil — izinli listeye uyduğu doğrulanamıyor.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'Button') return;
        for (const attr of node.attributes) {
          if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;
          const prop = attr.name.name;
          if (prop === 'leftIcon' || prop === 'rightIcon') {
            context.report({ node: attr, messageId: 'slot', data: { prop } });
          } else if (prop === 'icon') {
            const v = attr.value;
            const lits = v && v.type === 'Literal' ? [v] : v && v.type === 'JSXExpressionContainer' ? literalsOf(v.expression) : null;
            if (!lits) {
              context.report({ node: attr, messageId: 'dynamic' });
            } else {
              for (const l of lits) {
                if (typeof l.value !== 'string' || !BUTTON_ICON_ALLOWED.has(l.value)) {
                  context.report({ node: attr, messageId: 'icon', data: { name: String(l.value) } });
                }
              }
            }
          }
        }
      },
    };
  },
};

module.exports = {
  rules: {
    'no-raw-style-values': noRawStyleValues,
    'no-lira-symbol': noLiraSymbol,
    'restrict-button-icon': restrictButtonIcon,
  },
};
