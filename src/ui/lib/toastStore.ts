import { AccessibilityInfo } from 'react-native';

/**
 * Toast durumu — modül düzeyinde TEK kaynak (React dışında; `useSyncExternalStore` ile okunur).
 *
 * - Aynı anda tek toast (`current`). Aynı mesaj (ya da aynı `id`) yeniden atılırsa yeni kart açılmaz,
 *   süresi yenilenir (dedupe). Farklı bir mesaj gelirse eskisinin yerini alır (katman eskisini
 *   çıkış animasyonuyla kaldırıp yenisini getirir).
 * - Zamanlayıcı burada: toast bir katmandan diğerine geçerken (modal açıldı/kapandı) süre kesilmez.
 *   Süre toast ilk kez çizilince başlar (hiç katman yokken atılan toast'ınki ilk katman çizince).
 * - Katmanlar (`ToastLayer`): "en son bağlanan çizer". Kök `ToastHost` ilk katmandır; `@/ui` `Modal`
 *   ve `AlertDialog` kendi native pencerelerinde birer katman bağlar. Native modal penceresi kök
 *   görünümün üstünde olduğu için toast'ı yalnız en üstteki katman çizer.
 * - Alt boşluk kayıtları (`useToastBottomInset`): ekran dibindeki engeller (yüzen sekme çubuğu,
 *   PageShell alt çubuğu). Yalnız kök katman kullanır; en son kaydolan (değeri olan) geçerlidir.
 */
export type ToastKind = 'blank' | 'success' | 'error';

/** Toast kimliği (react-hot-toast gibi metin; sayı da kabul edilir ve metne çevrilir). */
export type ToastId = string | number;

export interface ToastOptions {
  /** ms; 0 = kullanıcı kapatana dek. */
  duration?: number;
  /**
   * Kimlik: aynı `id` ile yeniden atılan toast yeni kart açmaz, mevcut kartı günceller ve süresini
   * yeniler (react-hot-toast `id`). Verilmezse aynı tür + aynı metin aynı toast sayılır.
   */
  id?: ToastId;
}

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
  duration: number;
  /** Bir katman bu toast'ı en az bir kez gösterdi: katman devrinde giriş animasyonu tekrarlanmaz. */
  presented: boolean;
}

export interface ToastInset {
  /** Ekranın alt kenarından engelin üst kenarına uzaklık (pt). */
  value: number;
  /** Engel klavyeyle birlikte yukarı çıkıyor mu (ör. klavye farkındalıklı alt çubuk). */
  followsKeyboard: boolean;
}

export interface ToastSnapshot {
  current: ToastItem | null;
  /** Toast'ı çizen katman (en son bağlanan); yoksa null. */
  topLayer: number | null;
  /** Kök katmanın geçerli alt engeli; yoksa null (güvenli alan varsayılanı). */
  inset: ToastInset | null;
}

export const TOAST_DEFAULT_DURATION: Record<ToastKind, number> = {
  blank: 4000,
  success: 2000,
  error: 4000,
};

interface InsetEntry {
  key: number;
  value: number | null;
  followsKeyboard: boolean;
}

let current: ToastItem | null = null;
let layers: number[] = [];
let insets: InsetEntry[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let timerArmed = false;
let seq = 0;
let layerSeq = 0;
let insetSeq = 0;
const listeners = new Set<() => void>();

function compute(): ToastSnapshot {
  let inset: ToastInset | null = null;
  for (let i = insets.length - 1; i >= 0; i--) {
    const entry = insets[i]!;
    if (entry.value != null) {
      inset = { value: entry.value, followsKeyboard: entry.followsKeyboard };
      break;
    }
  }
  return { current, topLayer: layers.length ? layers[layers.length - 1]! : null, inset };
}

let snapshot: ToastSnapshot = compute();

function publish(): void {
  snapshot = compute();
  listeners.forEach((listener) => listener());
}

export function subscribeToast(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToastSnapshot(): ToastSnapshot {
  return snapshot;
}

/**
 * Çağıranlar çoğu zaman `any` hata gövdesi geçiriyor (`error.response.data.message` dizi ya da nesne
 * olabilir). Toast her zaman düz metin çizer: dizi → ilk eleman, hata/nesne → `message`, diğerleri
 * `String()`. Boş metin için toast atılmaz.
 */
export function normalizeToastMessage(input: unknown): string {
  const value = Array.isArray(input) ? input[0] : input;
  if (value == null) return '';
  if (typeof value === 'string') return value.trim() ? value : '';
  if (typeof value === 'object') {
    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string') return message.trim() ? message : '';
  }
  const text = String(value);
  return text.trim() ? text : '';
}

function clearTimer(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  timerArmed = false;
}

function armTimer(): void {
  clearTimer();
  if (!current) return;
  timerArmed = true;
  if (current.duration > 0) {
    const id = current.id;
    timer = setTimeout(() => dismissToast(id), current.duration);
  }
}

function announce(message: string): void {
  AccessibilityInfo.announceForAccessibility?.(message);
}

type ToastErrorFilter = (message: string) => boolean;
let errorFilter: ToastErrorFilter | null = null;

/**
 * Hata toast'ı süzgeci (TEK merkez): `true` dönerse `toast.error` gösterilmez. Başka bir bildirim
 * zaten aynı olayı anlatıyorsa (çevrimdışı diyaloğu) çift bildirim olmasın diye. `null` kaldırır.
 */
export function setToastErrorFilter(filter: ToastErrorFilter | null): void {
  errorFilter = filter;
}

export function showToast(kind: ToastKind, input: unknown, options?: ToastOptions): ToastId {
  const message = normalizeToastMessage(input);
  if (!message) return '';
  if (kind === 'error' && errorFilter?.(message)) return '';
  const duration = options?.duration ?? TOAST_DEFAULT_DURATION[kind];
  const sameContent = !!current && current.kind === kind && current.message === message;
  const id = options?.id != null ? String(options.id) : sameContent ? current!.id : `toast-${++seq}`;

  if (current && current.id === id) {
    // Dedupe: aynı kart güncellenir, süre yenilenir (giriş animasyonu tekrarlanmaz).
    if (current.message !== message) announce(message);
    current = { ...current, kind, message, duration };
  } else {
    current = { id, kind, message, duration, presented: false };
    announce(message);
  }
  // Süre toast görünmeye başlayınca (`markToastPresented`) işler; zaten görünen toast yenilenince
  // baştan başlar. Hiç katman yokken atılan toast'ın süresi böylece ilk katman çizince başlar.
  if (current.presented) armTimer();
  else clearTimer();
  publish();
  return id;
}

/** `id` verilirse yalnız o toast'ı, verilmezse görüneni kapatır. */
export function dismissToast(id?: ToastId): void {
  if (!current) return;
  if (id != null && id !== '' && current.id !== String(id)) return;
  clearTimer();
  current = null;
  publish();
}

export function registerToastLayer(): number {
  const id = ++layerSeq;
  layers = [...layers, id];
  publish();
  return id;
}

export function unregisterToastLayer(id: number): void {
  const before = layers.length;
  layers = layers.filter((layer) => layer !== id);
  // Son katman da gitti (kök host söküldü): görünen toast'ı da bırak — eski host davranışı
  // (sökülen host'un durumu kaybolurdu). Bağlanmadan atılan toast bundan etkilenmez.
  if (before > 0 && layers.length === 0) {
    clearTimer();
    current = null;
  }
  publish();
}

/** Bir katman toast'ı gösterdi (bkz. `ToastItem.presented`); süre bu andan işler. */
export function markToastPresented(id: string): void {
  if (!current || current.id !== id) return;
  if (!timerArmed) armTimer();
  if (current.presented) return;
  current = { ...current, presented: true };
  publish();
}

/** Alt engel kaydı: sıradaki yeri bağlanma anında belirlenir; değer güncellemesi sırayı değiştirmez. */
export function registerToastInset(): number {
  const key = ++insetSeq;
  insets = [...insets, { key, value: null, followsKeyboard: false }];
  return key;
}

export function updateToastInset(key: number, value: number | null, followsKeyboard: boolean): void {
  const entry = insets.find((e) => e.key === key);
  if (!entry || (entry.value === value && entry.followsKeyboard === followsKeyboard)) return;
  insets = insets.map((e) => (e.key === key ? { key, value, followsKeyboard } : e));
  publish();
}

export function unregisterToastInset(key: number): void {
  const had = insets.some((e) => e.key === key && e.value != null);
  insets = insets.filter((e) => e.key !== key);
  if (had) publish();
}

/** YALNIZ TEST: modül durumunu sıfırlar. */
export function resetToastStoreForTests(): void {
  clearTimer();
  errorFilter = null;
  current = null;
  layers = [];
  insets = [];
  publish();
}
