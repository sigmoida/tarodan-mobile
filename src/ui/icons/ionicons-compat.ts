import type { IconName, IconVariant } from './Icon';

/**
 * Ionicons -> Heroicons eşleme tablosu (GEÇİŞ).
 *
 * Neden var: dalga 3'te ikonlar Ionicons'tan web Heroicons'una taşındı. Henüz taşınmamış
 * (başka hatların sahip olduğu) dosyalar `IconButton icon="share-outline"` gibi Ionicons adı
 * vermeye devam edebilir; ortak bileşenler (`Button`, `IconButton`, `Input`, `EmptyState`, `FAB`…)
 * bu adı burada Heroicons karşılığına çevirir. YENİ KOD Ionicons adı yazmaz — `IconName` kullanır.
 *
 * Çözüm kuralı (`resolveIcon`):
 *  1. Ad bir Heroicons adıysa olduğu gibi (outline) kullanılır.
 *  2. Aksi halde Ionicons adı çevrilir: `-outline` son eki → outline, çıplak ad → solid;
 *     "çizgi/glif" ikonlar (chevron, x-mark, plus, check, arama, oklar…) her zaman outline
 *     (web de bunları yalnız outline kullanıyor).
 */

/** Ionicons taban adı (son eksiz) -> Heroicons adı. */
const BASE = {
  // glif/çizgi ikonlar
  search: 'magnifying-glass',
  close: 'x-mark',
  add: 'plus',
  remove: 'minus',
  checkmark: 'check',
  'checkmark-done': 'check',
  'chevron-forward': 'chevron-right',
  'chevron-back': 'chevron-left',
  'chevron-up': 'chevron-up',
  'chevron-down': 'chevron-down',
  'arrow-back': 'arrow-left',
  'arrow-forward': 'arrow-right',
  'arrow-up': 'arrow-up',
  'arrow-down': 'arrow-down',
  'swap-horizontal': 'arrows-right-left',
  'swap-vertical': 'arrows-up-down',
  'ellipsis-vertical': 'ellipsis-vertical',
  'ellipsis-horizontal': 'ellipsis-horizontal',
  menu: 'bars-3',
  list: 'list-bullet',
  grid: 'squares-2x2',
  link: 'link',
  filter: 'funnel',
  funnel: 'funnel',
  send: 'paper-airplane',
  share: 'share',
  'share-social': 'share',
  download: 'arrow-down-tray',
  'cloud-download': 'cloud-arrow-down',
  'cloud-upload': 'cloud-arrow-up',
  refresh: 'arrow-path',
  'refresh-circle': 'arrow-path',
  'arrow-undo': 'arrow-uturn-left',
  'return-up-back': 'arrow-uturn-left',
  resize: 'arrows-pointing-out',
  'log-out': 'arrow-left-on-rectangle',
  'log-in': 'arrow-right-on-rectangle',
  // nesne ikonlar
  'checkmark-circle': 'check-circle',
  'close-circle': 'x-circle',
  'alert-circle': 'exclamation-circle',
  warning: 'exclamation-triangle',
  'information-circle': 'information-circle',
  'help-circle': 'question-mark-circle',
  'add-circle': 'plus-circle',
  heart: 'heart',
  'heart-dislike': 'heart',
  star: 'star',
  'star-half': 'star',
  eye: 'eye',
  'eye-off': 'eye-slash',
  trash: 'trash',
  card: 'credit-card',
  time: 'clock',
  pricetag: 'tag',
  pricetags: 'tag',
  cube: 'cube',
  albums: 'rectangle-stack',
  chatbubbles: 'chat-bubble-left-right',
  chatbubble: 'chat-bubble-left',
  'chatbubble-ellipses': 'chat-bubble-left-ellipsis',
  notifications: 'bell',
  cart: 'shopping-cart',
  bag: 'shopping-bag',
  person: 'user',
  'person-circle': 'user-circle',
  'person-add': 'user-plus',
  people: 'user-group',
  'lock-closed': 'lock-closed',
  'shield-checkmark': 'shield-check',
  'shield-half': 'shield-check',
  shield: 'shield-check',
  settings: 'cog-6-tooth',
  flag: 'flag',
  pencil: 'pencil',
  create: 'pencil-square',
  camera: 'camera',
  calendar: 'calendar',
  image: 'photo',
  document: 'document-text',
  'document-text': 'document-text',
  'copy': 'clipboard-document',
  location: 'map-pin',
  ban: 'no-symbol',
  'stats-chart': 'chart-bar',
  qrcode: 'qr-code',
  rocket: 'rocket-launch',
  sparkles: 'sparkles',
  trophy: 'trophy',
  gift: 'gift',
  megaphone: 'megaphone',
  'thumbs-up': 'hand-thumb-up',
  'thumbs-down': 'hand-thumb-down',
  'trending-up': 'arrow-trending-up',
  'trending-down': 'arrow-trending-down',
  mail: 'envelope',
  business: 'building-office-2',
  briefcase: 'briefcase',
  cash: 'banknotes',
  headset: 'lifebuoy',
  home: 'home',
  library: 'building-library',
  construct: 'wrench-screwdriver',
  'id-card': 'identification',
  receipt: 'receipt-percent',
  'file-tray': 'inbox',
  school: 'academic-cap',
  ribbon: 'check-badge',
  diamond: 'sparkles',
  text: 'document-text',
  checkbox: 'check-circle',
  'ellipse': 'minus-circle',
  'radio-button-on': 'check-circle',
  'radio-button-off': 'minus-circle',
  sad: 'face-frown',
  car: 'truck',
  'mail-open': 'envelope-open',
  'paper-plane': 'paper-airplane',
  storefront: 'building-storefront',
} as const satisfies Record<string, IconName>;

/** Her zaman outline çizilen glif ikonlar (taban ad). */
const ALWAYS_OUTLINE = new Set([
  'search',
  'close',
  'add',
  'remove',
  'checkmark',
  'checkmark-done',
  'chevron-forward',
  'chevron-back',
  'chevron-up',
  'chevron-down',
  'arrow-back',
  'arrow-forward',
  'arrow-up',
  'arrow-down',
  'swap-horizontal',
  'swap-vertical',
  'ellipsis-vertical',
  'ellipsis-horizontal',
  'menu',
  'list',
  'grid',
  'link',
  'filter',
  'funnel',
  'send',
  'share',
  'share-social',
  'download',
  'cloud-download',
  'cloud-upload',
  'refresh',
  'refresh-circle',
  'arrow-undo',
  'return-up-back',
  'resize',
  'log-out',
  'log-in',
  'trending-up',
  'trending-down',
  'copy',
  'text',
]);

export interface ResolvedIcon {
  name: IconName;
  variant: IconVariant;
}

type LegacyBase = keyof typeof BASE;

/**
 * Çözümlenebilen Ionicons adları (GEÇİŞ — yeni kodda kullanmayın). `Button`/`IconButton`/
 * `Input`/`EmptyState`/`FAB` bu adları `IconName` ile birlikte kabul eder.
 */
export type LegacyIoniconName = LegacyBase | `${LegacyBase}-outline`;

/** Ionicons adını Heroicons karşılığına çevirir; eşleşme yoksa `null`. */
export function ioniconToIcon(ionName: string): ResolvedIcon | null {
  const outlineSuffix = /-(outline|sharp)$/.test(ionName);
  const base = ionName.replace(/-(outline|sharp)$/, '');
  const name = (BASE as Record<string, IconName>)[base];
  if (!name) return null;
  const variant: IconVariant = outlineSuffix || ALWAYS_OUTLINE.has(base) ? 'outline' : 'solid';
  return { name, variant };
}

/** Tüm eşleme taban adları (test için). */
export const IONICON_TARGET_NAMES: IconName[] = Array.from(new Set(Object.values(BASE)));
