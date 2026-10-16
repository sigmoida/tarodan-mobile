import { api } from './client';
import { apiPath } from './path';

// Messages API - Web ile aynı endpoint'ler
export const messagesApi = {
  getThreads: (params?: Record<string, any>) =>
    api.get('/messages/threads', { params }),
  getThread: (threadId: string) =>
    api.get(apiPath`/messages/threads/${threadId}`),
  getMessages: (threadId: string, params?: Record<string, any>) =>
    api.get(apiPath`/messages/threads/${threadId}/messages`, { params }),
  createThread: (data: { participantId: string; productId?: string }) =>
    api.post('/messages/threads', data),
  sendMessage: (threadId: string, content: string) =>
    api.post(apiPath`/messages/threads/${threadId}/messages`, { content }),
  // NOT: `POST /messages/threads/:id/read` API'de YOK — okundu bilgisi
  // `getMessages` (GET .../messages) ile sunucuda işlenir. Çağrı eklemeyin.
  /**
   * Bugünkü (UTC) kalan mesaj hakkı. Limit tek platform ayarıdır
   * (`daily_message_limit`, varsayılan 50) — üyelik katmanına göre değişmez.
   */
  getDailyLimit: () =>
    api.get<{ remaining: number; limit: number }>('/messages/daily-limit'),
  /** Tüm thread'lerdeki toplam okunmamış mesaj sayısı (header rozeti, sayfalama bağımsız) */
  getUnreadCount: () =>
    api.get<{ count: number }>('/messages/unread-count'),
};

// Notifications API - Web ile aynı endpoint'ler
export const notificationsApi = {
  getAll: (params?: Record<string, any>) => api.get('/notifications', { params }),
  markAsRead: (id: string) => api.patch(apiPath`/notifications/${id}/read`),
  /** Backend: POST /notifications/mark-all-read */
  markAllAsRead: () => api.post('/notifications/mark-all-read'),
  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  /** Mobile push bildirimleri için cihaz token kaydı (backend: POST /notifications/push-token) */
  registerPushToken: (data: { token: string; platform: 'ios' | 'android'; deviceId?: string }) =>
    api.post('/notifications/push-token', data),
};
