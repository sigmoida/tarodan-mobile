import { api, guestApi } from './client';
import type { DirectFormResponse } from '@/lib/payment/paytrDirectForm';
import { rememberPaymentCapability, withPaymentCapability } from '@/lib/payment/paymentCapability';

/**
 * Ödeme başlat + yanıttaki `paymentAccessToken`'ı sakla (web `initiatePayment`).
 * Misafir sonraki public ödeme uçlarında (`X-Payment-Capability`) bununla yetkilenir.
 *
 * Depo yazımı beklenmez: bellek kopyası senkron yazılır, sonraki istekler onu
 * okur; AsyncStorage yazımı arkada biter (kullanıcı kart bilgisini girip banka
 * uygulamasına geçmeden çok önce). Böylece ödeme başlatma depoya bağımlı olmaz.
 * `rememberPaymentCapability` hiç fırlatmaz.
 */
async function initiatePayment<T>(request: Promise<T>): Promise<T> {
  const response = await request;
  void rememberPaymentCapability(response);
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
 * sarmalayıcılardan geçer: `X-Payment-Capability` başlığı tek yerden eklenir.
 */
const paymentHttp = withPaymentCapability(api);
const guestPaymentHttp = withPaymentCapability(guestApi);

// Payments API - Web ile aynı endpoint'ler
export const paymentsApi = {
  /** Public ödeme yapılandırması: bypass (dev) + kayıtlı kart/oto-yenileme (Non3D) açık mı. */
  getConfig: () =>
    api.get<{ bypassEnabled: boolean; recurringEnabled: boolean }>('/payments/config'),
  initiate: (orderId: string | number, provider: 'paytr' = 'paytr') =>
    api.post('/payments/initiate', { orderId, provider }),
  /** Grup ödemesi: tek ödeme checkout grubundaki tüm siparişleri kapsar */
  initiateGroup: (checkoutGroupId: string, provider: 'paytr' = 'paytr') =>
    api.post('/payments/initiate', { checkoutGroupId, provider }),
  initiateGuest: (orderId: string | number, provider: 'paytr' = 'paytr') =>
    initiatePayment(guestApi.post('/payments/initiate-guest', { orderId, provider })),
  /** Grup ödemesi (misafir) */
  initiateGroupGuest: (checkoutGroupId: string, provider: 'paytr' = 'paytr') =>
    initiatePayment(guestApi.post('/payments/initiate-guest', { checkoutGroupId, provider })),
  /** Takas nakit fark ödemesi başlat */
  initiateTradeCash: (tradeId: string) =>
    api.post('/payments/initiate-trade-cash', { tradeId }),
  getStatus: (paymentId: string) =>
    api.get(`/payments/${paymentId}`),
  /** POST /payments/:id/verify — PayTR ödemesini aktif doğrula (web ile parite) */
  verify: (paymentId: string) =>
    paymentHttp.post(`/payments/${paymentId}/verify`, {}),
  getStatusLight: (paymentId: string) =>
    paymentHttp.get(`/payments/${paymentId}/status`),
  getStatusLightGuest: (paymentId: string) =>
    guestPaymentHttp.get(`/payments/${paymentId}/status-guest`),
  getMyPayments: (params?: {
    status?: string;
    provider?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/payments/me', { params }),
  cancel: (paymentId: string) =>
    api.post(`/payments/${paymentId}/cancel`),
  /** Fail sayfasında; hâlâ pending ise rezervasyonu serbest bırakır */
  confirmFailed: (paymentId: string) =>
    paymentHttp.post(`/payments/${paymentId}/confirm-failed`, {}),
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
   * Misafir: gövdede `paymentId` + başlıkta yetki belirteci (initiate-guest'ten);
   * ikisi olmadan sunucu 403 döner. Üye gövdesi/başlığı değişmedi (oturumla yetkili).
   */
  directForm: (body: {
    paymentId?: string;
    orderId?: string;
    checkoutGroupId?: string;
    tradeId?: string;
    savedCardId?: string;
    saveCard?: boolean;
  }) =>
    paymentHttp.post<DirectFormResponse>('/payments/direct-form', body),
};
