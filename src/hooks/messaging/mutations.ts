import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '@/lib/api';
import i18n from '@/i18n/config';
import { useAuthStore } from '@/stores/authStore';
import { useMessagesStore } from '@/stores/messagesStore';
import type { Message, MessageThread } from '@/stores/messagesStore';
import { normalizeMessage, normalizeThread } from '@/lib/messaging/normalize';
import {
  applyIncomingToCache,
  applyThreadReadToCache,
  prependThreadToCache,
} from '@/lib/messaging/cache';

/**
 * Günlük limit aşımını ayırt etmek için özel hata (UI ayrı mesaj gösterir).
 * `.message` çağıran ekranın generic catch'inde (`e?.message`) doğrudan
 * kullanıcıya basılıyor — React dışı, `paytrDirectForm.ts` ile aynı desen:
 * global `i18n`'den ÇAĞRI ANINDA (constructor'da, modül yüklenirken DEĞİL) okunur.
 */
export class DailyMessageLimitError extends Error {
  constructor() {
    super(i18n.t('message.dailyLimitError'));
    this.name = 'DailyMessageLimitError';
  }
}

/** POST /messages/threads/:id/messages — gönder + optimistik cache + günlük sayaç. */
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      threadId,
      content,
    }: {
      threadId: string;
      content: string;
    }): Promise<Message> => {
      if (!useMessagesStore.getState().canSendMessage()) throw new DailyMessageLimitError();
      const res = await messagesApi.sendMessage(threadId, content);
      return normalizeMessage(res.data);
    },
    onSuccess: (message, { threadId }) => {
      const myUserId = useAuthStore.getState().user?.id;
      const isOpen = useMessagesStore.getState().currentThreadId === threadId;
      applyIncomingToCache(qc, threadId, message, { isOpen, myUserId });
      useMessagesStore.getState().incrementDailyCount();
    },
  });
}

/** POST /messages/threads — thread bul/oluştur + ilk mesaj; thread id döner. */
export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipientId,
      content,
      productId,
    }: {
      recipientId: string;
      content: string;
      productId?: string;
    }): Promise<MessageThread> => {
      if (!useMessagesStore.getState().canSendMessage()) throw new DailyMessageLimitError();
      const res = await messagesApi.createThread({ participantId: recipientId, productId });
      const newThread = res.data;
      if (content) await messagesApi.sendMessage(newThread.id, content);
      return normalizeThread(newThread);
    },
    onSuccess: (thread) => {
      prependThreadToCache(qc, thread);
      useMessagesStore.getState().incrementDailyCount();
    },
  });
}

/**
 * POST /messages/threads/:id/read — okundu işaretle. Optimistik unread sıfırlama
 * onMutate'te; ⚠️ onSuccess/onSettled'da unread-count INVALIDATE ETME (rozet-1'e-
 * döner tuzağı — cache.ts:applyThreadReadToCache açıklamasına bak).
 */
export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string): Promise<void> => {
      try {
        await messagesApi.markAsRead(threadId);
      } catch {
        // POST /threads/:id/read yoksa (404) — optimistik state zaten güncel.
      }
    },
    onMutate: (threadId) => {
      applyThreadReadToCache(qc, threadId);
    },
  });
}
