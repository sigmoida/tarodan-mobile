import type { AxiosRequestConfig } from 'axios';
import { api, guestApi } from './client';
import type { DirectFormResponse } from '@/lib/payment/paytrDirectForm';
import type { PaymentConfig } from '@/lib/payment/capabilities';
import type { DirectFormBody } from '@/lib/payment/directFormBody';
import {
  forgetPaymentCapability,
  rememberPaymentCapability,
  withPaymentCapability,
} from '@/lib/payment/paymentCapability';

/**
 * Ödeme başlat + yanıttaki `paymentAccessToken`'ı sakla (web `initiatePayment`).
 * Misafir sonraki public ödeme uçlarında (`X-Payment-Capability`) bununla yetkilenir;
 * üyede de saklanır (web gibi): oturum ödeme ortasında düşerse durum yoklaması,
 * verify ve confirm-failed belirteçle çalışmaya devam eder. Kayıt kimin adına
 * alındığını taşır (`guest` → sahipsiz, yoksa o anki hesap): misafir istekleri
 * yalnız sahipsiz, üye istekleri yalnız aynı hesabın belirtecini ekler.
 *
 * Depo yazımı beklenmez: bellek kopyası senkron yazılır, sonraki istekler onu
 * okur; AsyncStorage yazımı arkada biter (kullanıcı kart bilgisini girip banka
 * uygulamasına geçmeden çok önce). Böylece ödeme başlatma depoya bağımlı olmaz.
 * `rememberPaymentCapability` hiç fırlatmaz.
 */
async function initiatePayment<T>(request: Promise<T>, scope: { guest?: boolean } = {}): Promise<T> {
  const response = await request;
  void rememberPaymentCapability(response, scope);
  return response;
}

// Addresses API - Web ile aynı endpoint'ler
export const addressesApi = {
  // Backend'de tekil adres ucu yok (GET /users/me/addresses/:id tanımlı değil) —
  // detay için listeden filtreleyin.
  getAll: () => api.get('/users/me/addresses'),
  create: (data: {
    title?: string;
    fullName: string;
    phone: string;
    city: string;
    district: string;
    address: string;
    zipCode?: string;
    isDefault?: boolean;
  }) => api.post('/users/me/addresses', data),
  update: (id: string, data: {
    title?: string;
    fullName?: string;
    phone?: string;
    city?: string;
    district?: string;
    address?: string;
    zipCode?: string;
    isDefault?: boolean;
  }) => api.patch(`/users/me/addresses/${id}`, data),
  delete: (id: string) => api.delete(`/users/me/addresses/${id}`),
  setDefault: (id: string) => api.patch(`/users/me/addresses/${id}`, { isDefault: true }),
};

/**
 * Yetki belirteci taşıyan ödeme uçları (`/payments/:id/...`, direct-form) bu
 * sarmalayıcılardan geçer: `paymentHttp(paymentId).post(...)`. Ödeme id'si
 * açıkça verilir; `X-Payment-Capability` başlığı tek yerden eklenir.
 *
 * Misafir yolunun TAMAMI `guestPaymentHttp` (`guestApi`) üzerinden: o instance
 * Bearer eklemez, 401'de refresh/çıkış yapmaz, `USER_BANNED`'da yönlendirmez.
 * `api` ise cihazda kalmış bir token'ı ekler; misafir ödeme ortasında 401 alırsa
 * interceptor çıkış yaptırıp login ekranına atardı. Üye yolu `api`'den gider.
 * Misafir sarmalayıcı yalnız misafirken alınmış (sahipsiz) belirteci ekler:
 * zorunlu çıkıştan kalan bir hesabın belirteci misafir oturumunda kullanılamaz.
 */
const paymentHttp = withPaymentCapability(api);
const guestPaymentHttp = withPaymentCapability(guestApi, { guest: true });

// Payments API - Web ile aynı endpoint'ler
export const paymentsApi = {
  /**
   * Public ödeme yapılandırması: bypass (dev) + amaç başına kart saklama /
   * oto-yenileme (`purposes.checkout|membership`). Okumak için `paymentCapabilities`.
   */
  getConfig: () => api.get<PaymentConfig>('/payments/config'),
  initiate: (orderId: string | number, provider: 'paytr' = 'paytr') =>
    initiatePayment(api.post('/payments/initiate', { orderId, provider })),
  /** Grup ödemesi: tek ödeme checkout grubundaki tüm siparişleri kapsar */
  initiateGroup: (checkoutGroupId: string, provider: 'paytr' = 'paytr') =>
    initiatePayment(api.post('/payments/initiate', { checkoutGroupId, provider })),
  initiateGuest: (orderId: string | number, provider: 'paytr' = 'paytr') =>
    initiatePayment(guestApi.post('/payments/initiate-guest', { orderId, provider }), { guest: true }),
  /** Grup ödemesi (misafir) */
  initiateGroupGuest: (checkoutGroupId: string, provider: 'paytr' = 'paytr') =>
    initiatePayment(guestApi.post('/payments/initiate-guest', { checkoutGroupId, provider }), { guest: true }),
  /** Takas nakit fark ödemesi başlat */
  initiateTradeCash: (tradeId: string) =>
    api.post('/payments/initiate-trade-cash', { tradeId }),
  getStatus: (paymentId: string) =>
    api.get(`/payments/${paymentId}`),
  /**
   * POST /payments/:id/verify — PayTR ödemesini aktif doğrula (web ile parite).
   * Sunucu dakikada 10 istekle sınırlı: yoklamada doğrudan değil
   * `@/lib/payment/verifyPacer` üzerinden çağırın (tempo + bütçe + zaman aşımı).
   */
  verify: (paymentId: string, config?: Pick<AxiosRequestConfig, 'timeout'>) =>
    paymentHttp(paymentId).post(`/payments/${paymentId}/verify`, {}, config),
  /** Misafir verify: `guestApi` + yetki belirteci. */
  verifyGuest: (paymentId: string, config?: Pick<AxiosRequestConfig, 'timeout'>) =>
    guestPaymentHttp(paymentId).post(`/payments/${paymentId}/verify`, {}, config),
  getStatusLight: (paymentId: string) =>
    paymentHttp(paymentId).get(`/payments/${paymentId}/status`),
  getStatusLightGuest: (paymentId: string) =>
    guestPaymentHttp(paymentId).get(`/payments/${paymentId}/status-guest`),
  getMyPayments: (params?: {
    status?: string;
    provider?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/payments/me', { params }),
  /** İptal (sunucu ödemeyi `failed` yapar): başarılıysa yetki belirteci kaydı silinir. */
  cancel: async (paymentId: string) => {
    const response = await api.post(`/payments/${paymentId}/cancel`);
    void forgetPaymentCapability(paymentId);
    return response;
  },
  /** Fail sayfasında; hâlâ pending ise rezervasyonu serbest bırakır */
  confirmFailed: (paymentId: string) =>
    paymentHttp(paymentId).post(`/payments/${paymentId}/confirm-failed`, {}),
  /** Misafir confirm-failed: `guestApi` + yetki belirteci. */
  confirmFailedGuest: (paymentId: string) =>
    guestPaymentHttp(paymentId).post(`/payments/${paymentId}/confirm-failed`, {}),
  /** Test bypass: PAYMENT_BYPASS=true iken tek kart başarılı */
  bypassComplete: (paymentId: string, cardNumber?: string) =>
    api.post(
      `/payments/${paymentId}/bypass-complete`,
      cardNumber ? { cardNumber } : {},
    ),
  retry: (paymentId: string) =>
    api.post(`/payments/${paymentId}/retry`),
  /**
   * Direct API (TEK ödeme yolu; misafir + üye). Sunucu İMZALI form alanlarını döner;
   * kart alanlarını İSTEMCİ ekler ve WebView doğrudan PayTR'ye POST eder.
   *
   * Gövdeye kart verisi KOYULAMAZ: backend `assertNoRawCardData` ile gövdenin her
   * seviyesinde kart alan adlarını arar ve 400 döner. (Eski `POST /payments/process-direct`
   * API'den kaldırıldı; kart-verisi sınırı testi varlığını yasaklıyor.)
   *
   * Gövde `buildDirectFormBody` ile kurulur (`distanceSalesAccepted` dahil — teklif
   * siparişinde mesafeli satış onayı yalnız burada gider). Web gibi `paymentId`
   * gövdede, yetki belirteci (varsa) başlıkta: misafir ikisi olmadan 403 alır. Üyede
   * belirteç yoksa sunucu `paymentId`'yi yok sayar (oturumla yetkili); belirteç varsa
   * hedefin bu ödemeye ait olduğunu doğrular.
   */
  directForm: (body: DirectFormBody) =>
    paymentHttp(body.paymentId).post<DirectFormResponse>('/payments/direct-form', body),
  /** Misafir direct-form: `guestApi` + yetki belirteci (gövdede `paymentId` zorunlu). */
  directFormGuest: (body: DirectFormBody) =>
    guestPaymentHttp(body.paymentId).post<DirectFormResponse>('/payments/direct-form', body),
};
