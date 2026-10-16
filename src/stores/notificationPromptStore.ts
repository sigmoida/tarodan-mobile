import { create } from 'zustand';

/** Ön-izin sheet'inin gösterildiği değer anı (metin buna göre seçilir). */
export type NotificationPromptReason = 'message' | 'offer' | 'order';

/**
 * Bildirim ön-izin sheet'inin açık/kapalı durumu — YALNIZ arayüz durumu (veri çekmez).
 * Açma kararı `offerNotificationPrompt` (`@/lib/notifications/prePrompt`) verir; sheet
 * (`NotificationPrePromptHost`) kökte bağlıdır.
 */
interface NotificationPromptState {
  reason: NotificationPromptReason | null;
  show: (reason: NotificationPromptReason) => void;
  hide: () => void;
}

export const useNotificationPromptStore = create<NotificationPromptState>((set) => ({
  reason: null,
  show: (reason) => set({ reason }),
  hide: () => set({ reason: null }),
}));
