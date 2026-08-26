import type { StatusVariant } from './status-variant';

export interface StatusConfig {
  label: string;
  variant: StatusVariant;
}

/**
 * Order status → Badge mapping
 * Used in: orders page, order detail, track-order, dashboard
 */
export const orderStatusConfig: Record<string, StatusConfig> = {
  pending_payment: { label: 'Ödeme Bekleniyor', variant: 'warning' },
  paid: { label: 'Ödendi', variant: 'success' },
  preparing: { label: 'Hazırlanıyor', variant: 'info' },
  shipped: { label: 'Kargoda', variant: 'info' },
  delivered: { label: 'Teslim Edildi', variant: 'success' },
  awaiting_buyer_confirmation: { label: 'Alıcı Onayı Bekleniyor', variant: 'warning' },
  completed: { label: 'Tamamlandı', variant: 'success' },
  cancelled: { label: 'İptal Edildi', variant: 'danger' },
  refund_requested: { label: 'İade Talep Edildi', variant: 'warning' },
  refunded: { label: 'İade Edildi', variant: 'secondary' },
};

/**
 * Trade status → Badge mapping
 * Used in: trades page, trade detail, dashboard
 */
/**
 * @deprecated Takas durumu için TEK kaynak `@/lib/shared/tradeStatus`
 * (`useTradeStatusConfig`). Bu statik kopya çeviri yapamadığı için sabit
 * Türkçe taşıyor ve kelimeleri paylaşılan haritadan ayrışmıştı; yeni çağıran
 * eklemeyin.
 */
export const tradeStatusConfig: Record<string, StatusConfig> = {
  pending: { label: 'Bekliyor', variant: 'warning' },
  accepted: { label: 'Kabul Edildi', variant: 'success' },
  rejected: { label: 'Reddedildi', variant: 'danger' },
  awaiting_payment: { label: 'Ödeme Bekleniyor', variant: 'warning' },
  shipping_to_warehouse: { label: 'Depoya Gönderim', variant: 'info' },
  at_warehouse: { label: 'Tarodan Deposunda', variant: 'info' },
  admin_reviewing: { label: 'İnceleniyor', variant: 'info' },
  shipping_to_recipients: { label: 'Alıcılara Gönderim', variant: 'info' },
  returning: { label: 'İade Yolda', variant: 'warning' },
  initiator_shipped: { label: 'Gönderildi', variant: 'info' },
  receiver_shipped: { label: 'Karşı Taraf Gönderdi', variant: 'info' },
  both_shipped: { label: 'İki Taraf Gönderdi', variant: 'info' },
  initiator_received: { label: 'Teslim Alındı', variant: 'info' },
  receiver_received: { label: 'Karşı Taraf Teslim Aldı', variant: 'info' },
  completed: { label: 'Tamamlandı', variant: 'success' },
  cancelled: { label: 'İptal Edildi', variant: 'danger' },
  disputed: { label: 'İtiraz Açıldı', variant: 'destructive' },
};

/**
 * RefundRequest status → Badge mapping
 * Used in: admin refund-requests page, mobile order detail refund banner
 */
export const refundRequestStatusConfig: Record<string, StatusConfig> = {
  pending_review: { label: 'İnceleniyor', variant: 'warning' },
  approved: { label: 'Onaylandı', variant: 'success' },
  wait_for_delivery: { label: 'Ürün Teslimi Bekleniyor', variant: 'info' },
  return_shipment_open: { label: 'İade Kargosu Hazır', variant: 'info' },
  return_in_transit: { label: 'İade Yolda', variant: 'info' },
  return_delivered: { label: 'İade Ulaştı', variant: 'info' },
  refunded: { label: 'Para İade Edildi', variant: 'success' },
  rejected: { label: 'Reddedildi', variant: 'danger' },
  disputed: { label: 'İtirazlı', variant: 'destructive' },
  cancelled: { label: 'İptal Edildi', variant: 'secondary' },
};

/**
 * Offer status → Badge mapping
 * Used in: offers page
 */
export const offerStatusConfig: Record<string, StatusConfig> = {
  pending: { label: 'Bekliyor', variant: 'warning' },
  accepted: { label: 'Kabul Edildi', variant: 'success' },
  rejected: { label: 'Reddedildi', variant: 'danger' },
  countered: { label: 'Karşı Teklif', variant: 'info' },
  expired: { label: 'Süresi Doldu', variant: 'secondary' },
  cancelled: { label: 'İptal Edildi', variant: 'danger' },
  payment_expired: { label: 'Ödeme Süresi Doldu', variant: 'warning' },
};

/**
 * Payment status → Badge mapping
 * Used in: payments page, payment detail
 */
export const paymentStatusConfig: Record<string, StatusConfig> = {
  pending: { label: 'Bekliyor', variant: 'warning' },
  processing: { label: 'İşleniyor', variant: 'info' },
  completed: { label: 'Tamamlandı', variant: 'success' },
  failed: { label: 'Başarısız', variant: 'danger' },
  refunded: { label: 'İade Edildi', variant: 'secondary' },
};

/**
 * Product status → Badge mapping
 * Used in: admin products, profile listings
 */
export const productStatusConfig: Record<string, StatusConfig> = {
  pending: { label: 'Onay Bekliyor', variant: 'warning' },
  active: { label: 'Aktif', variant: 'success' },
  inactive: { label: 'Pasif', variant: 'secondary' },
  sold: { label: 'Satıldı', variant: 'info' },
  reserved: { label: 'Rezerve', variant: 'info' },
  rejected: { label: 'Reddedildi', variant: 'danger' },
  deleted: { label: 'Kaldırıldı', variant: 'danger' },
};

/**
 * Product condition → label/Badge mapping (ProductCondition enum).
 * Şema değerleri: new, like_new, very_good, good, fair.
 */
export const productConditionConfig: Record<string, StatusConfig> = {
  new: { label: 'Yeni', variant: 'success' },
  like_new: { label: 'Yeni Gibi', variant: 'info' },
  very_good: { label: 'Çok İyi', variant: 'info' },
  good: { label: 'İyi', variant: 'default' },
  fair: { label: 'Orta', variant: 'warning' },
};

/**
 * Admin role → label/Badge mapping (AdminRole enum).
 */
export const adminRoleConfig: Record<string, StatusConfig> = {
  super_admin: { label: 'Süper Admin', variant: 'danger' },
  admin: { label: 'Yönetici', variant: 'primary' },
  moderator: { label: 'Moderatör', variant: 'info' },
};

/**
 * Support ticket status → label/Badge mapping (TicketStatus enum).
 */
export const ticketStatusConfig: Record<string, StatusConfig> = {
  open: { label: 'Açık', variant: 'warning' },
  in_progress: { label: 'İşlemde', variant: 'info' },
  waiting_customer: { label: 'Müşteri Bekleniyor', variant: 'warning' },
  resolved: { label: 'Çözüldü', variant: 'success' },
  closed: { label: 'Kapalı', variant: 'secondary' },
};

/**
 * Tax rule scope → label mapping (TaxRuleScope enum).
 */
export const taxScopeConfig: Record<string, StatusConfig> = {
  default_rate: { label: 'Varsayılan oran', variant: 'default' },
  category: { label: 'Kategori', variant: 'info' },
  product: { label: 'Ürün', variant: 'secondary' },
};

/** Üyelik paketi (MembershipTierType: free/basic/premium/business). */
export const membershipTierConfig: Record<string, StatusConfig> = {
  free: { label: 'Ücretsiz', variant: 'secondary' },
  basic: { label: 'Basit', variant: 'info' },
  premium: { label: 'Premium', variant: 'warning' },
  business: { label: 'İşletme', variant: 'primary' },
};

/**
 * İade nedeni (RefundReason) — TEK kaynak.
 *
 * Bu harita dört ayrı dosyada üç farklı sürümle yazılmıştı; hepsi buraya
 * bağlandı. Etiketler kullanıcıya hem seçicide hem listelerde göründüğü için
 * tek bir ifade kullanılır — iki bağlamda iki farklı sözcük kullanmak,
 * sözlüklerin ilk ayrışma sebebiydi.
 */
export const refundReasonConfig: Record<string, StatusConfig> = {
  changed_mind: { label: 'Fikrim değişti', variant: 'secondary' },
  damaged: { label: 'Hasarlı geldi', variant: 'danger' },
  wrong_item: { label: 'Yanlış ürün geldi', variant: 'warning' },
  not_as_described: { label: 'Açıklamayla uyuşmuyor', variant: 'warning' },
  missing_parts: { label: 'Eksik parça var', variant: 'warning' },
  counterfeit: { label: 'Sahte / taklit', variant: 'danger' },
  // `defective` + `buyer_damaged`: sunucu enum'unda VARDI, burada yoktu.
  // Staging'de ölçüldü (2026-08-26, `POST /orders/:id/refund-requests` geçersiz
  // bir kodla tam listeyi geri veriyor). Eksik olduklarında iki şey oluyordu:
  // bu kodu taşıyan bir talep ekranda ham `snake_case` basılıyordu ve alıcı
  // web'de seçebildiği iki nedeni mobilde seçemiyordu.
  defective: { label: 'Arızalı / kusurlu', variant: 'danger' },
  buyer_damaged: { label: 'Alıcı kaynaklı hasar', variant: 'warning' },
  lost_in_transit: { label: 'Kargoda kayboldu', variant: 'danger' },
  delivery_delayed: { label: 'Teslimat gecikti', variant: 'warning' },
  other: { label: 'Diğer', variant: 'default' },
};

/** Sunucunun `RefundReason` enum'u — staging'de ölçülen tam liste (2026-08-26). */
export const REFUND_REASONS = [
  'delivery_delayed',
  'changed_mind',
  'damaged',
  'wrong_item',
  'not_as_described',
  'missing_parts',
  'counterfeit',
  'defective',
  'buyer_damaged',
  'lost_in_transit',
  'other',
] as const;

/**
 * Nedenin okunur etiketi. Sunucunun tam enum listesi doğrulanamadı, o yüzden
 * tanımadığımız bir kod SESSİZCE düşmez — ham kod basılır ki ekranda boş bir
 * "Sebep:" satırı kalmasın.
 */
export function refundReasonLabel(reason: string | null | undefined): string {
  if (!reason) return '';
  return refundReasonConfig[reason]?.label ?? reason;
}

/**
 * Alıcının iade talebi açarken SEÇEBİLECEĞİ nedenler.
 *
 * Sözlüğün tamamı değil: `lost_in_transit` operasyonel bir TESPİT (kargo
 * takibinden gelir), `other` ise politika çözümü olmayan serbest kova. İkisi de
 * gösterilebilmeli ama seçtirilmemeli — bu yüzden gösterim
 * (`refundReasonConfig`) ile seçim listesi ayrı, etiketleri ortak.
 *
 * Liste artık ELLE yazılmıyor, sözlükten TÜRETİLİYOR ve kural web'inkiyle
 * birebir aynı (`BUYER_SELECTABLE_REFUND_REASONS`). Elle yazıldığı sürece iki
 * kod (`defective`, `buyer_damaged`) sunucu enum'unda olduğu hâlde mobilde
 * seçilemiyordu ve `other` web'de sunulmadığı hâlde burada sunuluyordu.
 * Türetme, sunucuya yeni bir neden eklendiğinde tek bir sözlük satırının
 * yetmesini sağlıyor.
 */
export const BUYER_SELECTABLE_REFUND_REASONS = Object.keys(
  refundReasonConfig,
).filter((reason) => reason !== 'lost_in_transit' && reason !== 'other');

export const REFUND_REASON_OPTIONS: Array<{ value: string; label: string }> =
  BUYER_SELECTABLE_REFUND_REASONS
  // Sözlükte olmayan bir kod (yazım hatası) yalnız listeden DÜŞER; `!` ile
  // iddia etmek import anında TypeError atıp iade ekranını beyaz ekrana
  // çeviriyordu — tek bir harf yüzünden.
  .flatMap((value) => {
    const config = refundReasonConfig[value];
    return config ? [{ value, label: config.label }] : [];
  });

/** Kargo/gönderi durumu (ShipmentStatus). */
export const shipmentStatusConfig: Record<string, StatusConfig> = {
  pending: { label: 'Beklemede', variant: 'warning' },
  label_created: { label: 'Etiket Oluşturuldu', variant: 'info' },
  picked_up: { label: 'Teslim Alındı', variant: 'info' },
  in_transit: { label: 'Yolda', variant: 'info' },
  at_delivery_branch: { label: 'Teslimat Şubesinde', variant: 'info' },
  out_for_delivery: { label: 'Dağıtımda', variant: 'info' },
  delivered: { label: 'Teslim Edildi', variant: 'success' },
  failed: { label: 'Başarısız', variant: 'danger' },
  return_in_progress: { label: 'İade İşlemde', variant: 'warning' },
  returned: { label: 'İade Edildi', variant: 'secondary' },
  cancelled: { label: 'İptal Edildi', variant: 'danger' },
};

/** Bildirim kanalı (push/email/sms/in_app). */
export const notificationChannelConfig: Record<string, StatusConfig> = {
  push: { label: 'Push Bildirimi', variant: 'info' },
  email: { label: 'E-posta', variant: 'info' },
  sms: { label: 'SMS', variant: 'info' },
  in_app: { label: 'Uygulama İçi', variant: 'info' },
};

/** Bildirim/gönderim teslim durumu. */
export const deliveryStatusConfig: Record<string, StatusConfig> = {
  pending: { label: 'Beklemede', variant: 'warning' },
  scheduled: { label: 'Zamanlandı', variant: 'info' },
  sent: { label: 'Gönderildi', variant: 'info' },
  delivered: { label: 'Teslim Edildi', variant: 'success' },
  failed: { label: 'Başarısız', variant: 'danger' },
  cancelled: { label: 'İptal Edildi', variant: 'secondary' },
};

/** Destek talebi kategorisi (TicketCategory). */
export const ticketCategoryConfig: Record<string, StatusConfig> = {
  payment: { label: 'Ödeme', variant: 'info' },
  shipping: { label: 'Kargo', variant: 'info' },
  trade: { label: 'Takas', variant: 'info' },
  account: { label: 'Hesap', variant: 'info' },
  product: { label: 'Ürün', variant: 'info' },
  technical: { label: 'Teknik Destek', variant: 'info' },
  other: { label: 'Diğer', variant: 'default' },
};

/** Destek talebi önceliği (TicketPriority). */
export const ticketPriorityConfig: Record<string, StatusConfig> = {
  low: { label: 'Düşük', variant: 'secondary' },
  medium: { label: 'Orta', variant: 'info' },
  high: { label: 'Yüksek', variant: 'warning' },
  urgent: { label: 'Acil', variant: 'danger' },
};

/** Satıcı/başvuru tipi (SellerType). */
export const sellerTypeConfig: Record<string, StatusConfig> = {
  individual: { label: 'Bireysel', variant: 'info' },
  verified: { label: 'Onaylı Satıcı', variant: 'success' },
  platform: { label: 'Platform', variant: 'primary' },
};

/** Ödeme bekletme (escrow) durumu (PaymentHoldStatus). */
export const paymentHoldStatusConfig: Record<string, StatusConfig> = {
  held: { label: 'Tutuluyor', variant: 'warning' },
  released: { label: 'Serbest Bırakıldı', variant: 'success' },
  cancelled: { label: 'İptal Edildi', variant: 'danger' },
};

/** Satıcı ödeme aktarımı durumu (PayoutStatus). */
export const payoutStatusConfig: Record<string, StatusConfig> = {
  pending: { label: 'Beklemede', variant: 'warning' },
  processing: { label: 'İşleniyor', variant: 'info' },
  completed: { label: 'Tamamlandı', variant: 'success' },
  failed: { label: 'Başarısız', variant: 'danger' },
  returned: { label: 'Geri Döndü', variant: 'secondary' },
  retry_pending: { label: 'Yeniden Denenecek', variant: 'warning' },
};

/** Üyelik abonelik durumu (SubscriptionStatus). */
export const subscriptionStatusConfig: Record<string, StatusConfig> = {
  active: { label: 'Aktif', variant: 'success' },
  trialing: { label: 'Deneme', variant: 'info' },
  cancelled: { label: 'İptal Edildi', variant: 'secondary' },
  expired: { label: 'Süresi Doldu', variant: 'danger' },
  past_due: { label: 'Vadesi Geçmiş', variant: 'warning' },
};

/** İndirim tipi (DiscountType). */
export const discountTypeConfig: Record<string, StatusConfig> = {
  percentage: { label: 'Yüzde İndirim', variant: 'info' },
  fixed_amount: { label: 'Sabit Tutar', variant: 'info' },
  bogo: { label: 'Al-Götür (BOGO)', variant: 'info' },
  bulk_quantity: { label: 'Toplu Adet', variant: 'info' },
};

/** İndirim kapsamı (DiscountScope). */
export const discountScopeConfig: Record<string, StatusConfig> = {
  global: { label: 'Genel', variant: 'primary' },
  category: { label: 'Kategori', variant: 'info' },
  product: { label: 'Ürün', variant: 'secondary' },
  seller: { label: 'Satıcı', variant: 'info' },
};

/** Mesaj durumu (MessageStatus). */
export const messageStatusConfig: Record<string, StatusConfig> = {
  sent: { label: 'Gönderildi', variant: 'success' },
  pending_approval: { label: 'Onay Bekliyor', variant: 'warning' },
  approved: { label: 'Onaylandı', variant: 'success' },
  rejected: { label: 'Reddedildi', variant: 'danger' },
};

/** Log önem derecesi (severity). */
export const severityConfig: Record<string, StatusConfig> = {
  critical: { label: 'Kritik', variant: 'destructive' },
  error: { label: 'Hata', variant: 'danger' },
  warning: { label: 'Uyarı', variant: 'warning' },
  info: { label: 'Bilgi', variant: 'info' },
  debug: { label: 'Hata Ayıklama', variant: 'secondary' },
};

/** Ödeme sağlayıcı (markalı; sadece okunur biçim). */
export const paymentProviderConfig: Record<string, StatusConfig> = {
  paytr: { label: 'PayTR', variant: 'default' },
  iyzico: { label: 'iyzico', variant: 'default' },
  stripe: { label: 'Stripe', variant: 'default' },
  manual: { label: 'Manuel', variant: 'secondary' },
};

/** Kargo sağlayıcı (markalı; sadece okunur biçim). */
export const shipmentProviderConfig: Record<string, StatusConfig> = {
  surat: { label: 'Sürat Kargo', variant: 'default' },
};

/**
 * Bir enum config'inden ham değeri okunabilir etikete çevir.
 * Eşleşme yoksa fallback (verilmezse ham değer / '—') döner.
 */
export function enumLabel(
  config: Record<string, StatusConfig>,
  value?: string | null,
  fallback?: string,
): string {
  if (!value) return fallback ?? '—';
  return config[value]?.label ?? fallback ?? value;
}
