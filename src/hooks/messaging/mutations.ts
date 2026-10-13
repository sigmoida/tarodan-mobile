import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { messagesApi } from '@/lib/api';
import i18n from '@/i18n/config';
import { useAuthStore } from '@/stores/authStore';
import { useMessagesStore } from '@/stores/messagesStore';
import { isCachedLimitExhausted, type DailyLimit } from '@/lib/messaging/dailyLimit';
import type { QueryClient } from '@tanstack/react-query';
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

/**
 * Günlük hak önbelleği (`qk.messaging.dailyLimit`): gönderimden önce BUGÜN alınmış
 * "hak bitti" kaydı varsa isteği atmadan reddet; gönderimden sonra hakkı bir düşür
 * ve sunucu sayımıyla eşitlemek için tazele. Sayaç store'da DEĞİL, sunucuda.
 */
function assertDailyLimitLeft(qc: QueryClient): void {
  const key = qk.messaging.dailyLimit;
  const state = qc.getQueryState<DailyLimit | null>(key);
  if (isCachedLimitExhausted(qc.getQueryData<DailyLimit | null>(key), state?.dataUpdatedAt)) {
    throw new DailyMessageLimitError();
  }
}

function consumeDailyMessage(qc: QueryClient): void {
  qc.setQueryData<DailyLimit | null>(qk.messaging.dailyLimit, (d) =>
    d ? { ...d, remaining: Math.max(0, d.remaining - 1) } : d,
  );
  qc.invalidateQueries({ queryKey: qk.messaging.dailyLimit });
}

/** POST /messages/threads/:id/messages — gönder + optimistik cache + günlük hak. */
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
      assertDailyLimitLeft(qc);
      const res = await messagesApi.sendMessage(threadId, content);
      return normalizeMessage(res.data);
    },
    onSuccess: (message, { threadId }) => {
      const myUserId = useAuthStore.getState().user?.id;
      const isOpen = useMessagesStore.getState().currentThreadId === threadId;
      applyIncomingToCache(qc, threadId, message, { isOpen, myUserId });
      consumeDailyMessage(qc);
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
      assertDailyLimitLeft(qc);
      const res = await messagesApi.createThread({ participantId: recipientId, productId });
      const newThread = res.data;
      if (content) await messagesApi.sendMessage(newThread.id, content);
      return normalizeThread(newThread);
    },
    onSuccess: (thread, { content }) => {
      prependThreadToCache(qc, thread);
      // Thread açmak mesaj sayılmaz; yalnız ilk mesaj gönderildiyse hak düşer.
      if (content) consumeDailyMessage(qc);
    },
  });
}

/**
 * Thread açıldığında okundu işaretle. API'de `POST /messages/threads/:id/read`
 * YOK; sunucu okundu bilgisini `GET /messages/threads/:id/messages` sırasında
 * işler. İki adım:
 *  1. Yerel unread'i (thread listesi + rozet) optimistik sıfırla.
 *  2. Mesaj sorgusunu invalidate et → GET tetiklenir. Global staleTime 5 dk
 *     olduğundan bu olmadan, kapalı thread'e socket'ten mesaj gelip 5 dk içinde
 *     thread açılınca önbellekten servis edilir: sunucuda okunmamış kalır,
 *     rozet geri gelir, yeni mesaj da görünmezdi. `cancelRefetch: false` ile
 *     ilk açılıştaki uçuştaki GET iptal edilip tekrarlanmaz.
 * ⚠️ unread-count INVALIDATE ETME (rozet-1'e-döner tuzağı — cache.ts:
 * applyThreadReadToCache açıklamasına bak).
 */
export function useMarkAsRead(): (threadId: string) => void {
  const qc = useQueryClient();
  return useCallback(
    (threadId: string) => {
      applyThreadReadToCache(qc, threadId);
      qc.invalidateQueries({ queryKey: qk.messaging.messages(threadId) }, { cancelRefetch: false });
    },
    [qc],
  );
}
