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

/**
 * Boş durum TEK bileşenden gelir (`EmptyState`, `@/ui`): ikon + başlık + alt başlık, aynı
 * yerleşim. `ListEmptyComponent` içinde elle çizilmiş boş görünüm (View/Text/RawText/Pressable)
 * yasak (metin içeren View/Text) — EmptyState (ya da onu saran ortak bileşen: ProductListEmpty,
 * OffersEmpty…), Skeleton ve ErrorState kullanılır. Koşullu / mantıksal dallar içindeki kök öğeler de taranır.
 */
const RAW_EMPTY_ROOTS = new Set(['View', 'Text', 'RawText', 'Pressable', 'Image']);
const TEXT_TAGS = new Set(['Text', 'RawText']);

const tagName = (el) => {
  const n = el && el.openingElement && el.openingElement.name;
  return n && n.type === 'JSXIdentifier' ? n.name : null;
};

/** Öğe (kendisi ya da torunları) metin içeriyor mu? İskelet (Skeleton*) View'ları metin taşımaz. */
function containsText(el) {
  if (TEXT_TAGS.has(tagName(el))) return true;
  return (el.children || []).some((c) => c.type === 'JSXElement' && containsText(c));
}

/** İfade ağacındaki (koşul / && / ||) JSX kök öğelerini toplar. */
function jsxRootsOf(expr, out = []) {
  if (!expr) return out;
  if (expr.type === 'JSXElement') out.push(expr);
  else if (expr.type === 'ConditionalExpression') {
    jsxRootsOf(expr.consequent, out);
    jsxRootsOf(expr.alternate, out);
  } else if (expr.type === 'LogicalExpression') {
    jsxRootsOf(expr.right, out);
  }
  return out;
}

/** @type {import('eslint').Rule.RuleModule} */
const emptyStateStandard = {
  meta: {
    type: 'suggestion',
    docs: { description: 'ListEmptyComponent içinde elle çizilmiş boş durum yerine EmptyState kullan' },
    schema: [],
    messages: {
      raw: "ListEmptyComponent içinde elle çizilmiş <{{name}}> — boş durum için EmptyState (@/ui: ikon + başlık + alt başlık) kullan. Bkz. CLAUDE.md §14.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'ListEmptyComponent') return;
        const v = node.value;
        if (!v || v.type !== 'JSXExpressionContainer') return;
        for (const el of jsxRootsOf(v.expression)) {
          const name = tagName(el);
          // Metin içermeyen View (iskelet, yükleniyor) boş durum değildir.
          if (name && RAW_EMPTY_ROOTS.has(name) && containsText(el)) {
            context.report({ node: el, messageId: 'raw', data: { name } });
          }
        }
      },
    };
  },
};

/**
 * Query anahtarlarının TEK kaynağı `qk` (`src/lib/query/keys.ts`, CLAUDE.md §6). Satır içi dizi
 * (`queryKey: ['x', id]`, `invalidates: [['x']]`, `setQueryData(['x'], …)`) sessiz drift'in
 * kaynağıydı (`['sale-order', id]` hiçbir mutasyonun tazelemediği anahtardı). Kayıt defteri
 * dosyası ve testler `.eslintrc.cjs` override'ında muaf.
 */
const KEY_FIRST_ARG_METHODS = new Set([
  'setQueryData',
  'getQueryData',
  'getQueryState',
  'ensureQueryData',
  'fetchQuery',
  'prefetchQuery',
]);

const propName = (node) =>
  node.key.type === 'Identifier' ? node.key.name : node.key.type === 'Literal' ? String(node.key.value) : null;

/** @type {import('eslint').Rule.RuleModule} */
const noInlineQueryKey = {
  meta: {
    type: 'suggestion',
    docs: { description: 'queryKey satır içi dizi olamaz — qk (@/lib/query) kullan' },
    schema: [],
    messages: {
      inline: "Satır içi query anahtarı — `qk.<domain>.*` (@/lib/query) kullan; yoksa src/lib/query/keys.ts'e ekle. Bkz. CLAUDE.md §6.",
    },
  },
  create(context) {
    return {
      Property(node) {
        const key = propName(node);
        if (key === 'queryKey' && node.value.type === 'ArrayExpression') {
          context.report({ node: node.value, messageId: 'inline' });
        } else if (key === 'invalidates' && node.value.type === 'ArrayExpression') {
          for (const el of node.value.elements) {
            if (el && el.type === 'ArrayExpression') context.report({ node: el, messageId: 'inline' });
          }
        }
      },
      CallExpression(node) {
        const c = node.callee;
        if (c.type !== 'MemberExpression' || c.property.type !== 'Identifier') return;
        if (!KEY_FIRST_ARG_METHODS.has(c.property.name)) return;
        const first = node.arguments[0];
        if (first && first.type === 'ArrayExpression') context.report({ node: first, messageId: 'inline' });
      },
    };
  },
};

/**
 * Yükleme göstergesi TEK yerde: `src/ui/loading/LoadingIndicator.tsx` (değiştirme noktası — özel
 * animasyona geçişte yalnız orası değişir). Başka yerde RN `ActivityIndicator` import'u (adlı ya da
 * `import * as RN` + `RN.ActivityIndicator`) uyarı verir; `LoadingIndicator` / `Spinner` /
 * `ScreenLoader` / `Button isLoading` (@/ui) kullanılır. Çekip yenileme (`RefreshControl`) native kalır.
 */
const ACTIVITY_INDICATOR_ALLOWED = ['/src/ui/loading/'];

/** @type {import('eslint').Rule.RuleModule} */
const noRawActivityIndicator = {
  meta: {
    type: 'suggestion',
    docs: { description: 'RN ActivityIndicator yalnız src/ui/loading/ içinde — LoadingIndicator (@/ui) kullan' },
    schema: [],
    messages: {
      raw: "Ham 'ActivityIndicator' — tek gösterge LoadingIndicator / Spinner / ScreenLoader ya da Button isLoading (@/ui) kullan. Bkz. CLAUDE.md §14 Loading.",
    },
  },
  create(context) {
    const filename = String(context.filename || (context.getFilename && context.getFilename()) || '').replace(/\\/g, '/');
    if (ACTIVITY_INDICATOR_ALLOWED.some((a) => filename.includes(a))) return {};
    const namespaces = new Set();
    const isNs = (o) => o && (o.type === 'Identifier' || o.type === 'JSXIdentifier') && namespaces.has(o.name);
    return {
      ImportDeclaration(node) {
        if (!node.source || node.source.value !== 'react-native' || node.importKind === 'type') return;
        for (const sp of node.specifiers || []) {
          if (sp.type === 'ImportNamespaceSpecifier') namespaces.add(sp.local.name);
          else if (
            sp.type === 'ImportSpecifier' &&
            sp.importKind !== 'type' &&
            sp.imported &&
            (sp.imported.name || sp.imported.value) === 'ActivityIndicator'
          ) {
            context.report({ node: sp, messageId: 'raw' });
          }
        }
      },
      MemberExpression(node) {
        if (!node.computed && isNs(node.object) && node.property.name === 'ActivityIndicator') {
          context.report({ node, messageId: 'raw' });
        }
      },
      JSXMemberExpression(node) {
        if (isNs(node.object) && node.property.name === 'ActivityIndicator') {
          context.report({ node, messageId: 'raw' });
        }
      },
    };
  },
};

/**
 * API yolu kodlanmadan interpolasyon yasak (güvenlik). expo-router parametreleri (derin
 * bağlantı/push) çözülmüş gelir; `api.post(`/trades/${id}/accept`)` içinde `id =
 * "x/../../offers/<id>/accept?"` isteği başka bir uca yönlendirebiliyordu. Yol değişkeni
 * `apiPath` etiketli şablonla yazılır (her interpolasyon `seg()` → doğrula + encode),
 * bkz. `src/lib/api/path.ts`. Sorgu parametreleri axios `params` ile gider.
 */
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
const API_CLIENTS = new Set(['api', 'guestApi']);

/** `api.get(...)`, `guestApi.post(...)`, `paymentHttp(id).post(...)` gibi bir HTTP çağrısı mı? */
function isApiClientCall(callee) {
  if (!callee || callee.type !== 'MemberExpression' || callee.computed) return false;
  if (callee.property.type !== 'Identifier' || !HTTP_METHODS.has(callee.property.name)) return false;
  const obj = callee.object;
  if (obj.type === 'Identifier') return API_CLIENTS.has(obj.name);
  // `paymentHttp(paymentId).post(...)` — axios instance döndüren fabrika.
  return obj.type === 'CallExpression' && obj.callee.type === 'Identifier' && /Http$/.test(obj.callee.name);
}

/** Kodlanmamış dinamik yol mu? Şablon (interpolasyonlu) ya da sabit olmayan `+` birleştirme. */
function isUnencodedDynamicPath(node) {
  if (!node) return false;
  if (node.type === 'TemplateLiteral') return node.expressions.length > 0;
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const isStatic = (n) => n.type === 'Literal' || (n.type === 'TemplateLiteral' && n.expressions.length === 0);
    if (!isStatic(node.left) && node.left.type !== 'BinaryExpression') return true;
    if (!isStatic(node.right)) return true;
    return isUnencodedDynamicPath(node.left);
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
const encodedApiPath = {
  meta: {
    type: 'problem',
    docs: { description: 'API yolundaki değişkenler apiPath`…` ile kodlanmalı (yol enjeksiyonu)' },
    schema: [],
    messages: {
      unencoded:
        "API yolunda kodlanmamış değişken — apiPath`/x/${id}` kullan (`@/lib/api/path`); sorgu değerleri axios `params` ile. Bkz. CLAUDE.md §6.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isApiClientCall(node.callee)) return;
        const url = node.arguments[0];
        if (isUnencodedDynamicPath(url)) context.report({ node: url, messageId: 'unencoded' });
      },
    };
  },
};

/**
 * `useXxxStore()` — argümansız (tüm store'a abone) çağrı. Store'daki HER yazım bileşeni yeniden
 * render eder; selector (`useAuthStore((s) => s.user)`) ya da çok alanda `useShallow` kullan,
 * callback içinde okuma için `useXxxStore.getState()`. Bkz. CLAUDE.md §8.
 * Not: `useSyncExternalStore` her zaman argümanlı olduğundan eşleşmez.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
const noWholeStoreSubscription = {
  meta: {
    type: 'suggestion',
    docs: { description: "Argümansız use*Store() (tüm store aboneliği) yerine selector kullan" },
    schema: [],
    messages: {
      whole:
        "'{{name}}()' tüm store'a abone olur (her yazımda render). Selector kullan: {{name}}((s) => s.alan); çok alanda useShallow; callback'te {{name}}.getState(). Bkz. CLAUDE.md §8.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'Identifier' || !/^use[A-Z]\w*Store$/.test(callee.name)) return;
        if (node.arguments.length > 0) return;
        context.report({ node, messageId: 'whole', data: { name: callee.name } });
      },
    };
  },
};

module.exports = {
  rules: {
    'encoded-api-path': encodedApiPath,
    'no-raw-activity-indicator': noRawActivityIndicator,
    'no-inline-query-key': noInlineQueryKey,
    'empty-state-standard': emptyStateStandard,
    'restrict-button-icon': restrictButtonIcon,
    'no-raw-style-values': noRawStyleValues,
    'no-lira-symbol': noLiraSymbol,
    'no-custom-screen-header': noCustomScreenHeader,
    'no-native-header': noNativeHeader,
    'no-whole-store-subscription': noWholeStoreSubscription,
  },
};
