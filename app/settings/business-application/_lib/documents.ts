import { theme } from '@/ui';
import type { MessageKey } from '@/i18n/lib';
import type { SellerDocumentStatus } from './types';

/**
 * Zengin akışın 7 belge türü (web /profile/business ile birebir).
 *
 * Etiketler `labelKey` olarak taşınır, çözülmüş metin olarak DEĞİL: bu sabitler
 * modül seviyesinde kuruluyor ve orada `t()` çağırmak metni ilk yüklenen dilde
 * dondururdu. Çeviriyi çağıran bileşen yapar. (Ana repodaki paylaşılan
 * `status-configs` de aynı `labelKey` biçimini kullanıyor.)
 */
export const DOCUMENT_TYPES = [
  { type: 'tax_plate', labelKey: 'sellerDocument.taxPlate' },
  { type: 'residence_or_invoice', labelKey: 'sellerDocument.residenceOrInvoice' },
  { type: 'signature_circular', labelKey: 'sellerDocument.signatureCircular' },
  { type: 'trade_registry_gazette', labelKey: 'sellerDocument.tradeRegistryGazette' },
  { type: 'activity_certificate', labelKey: 'sellerDocument.activityCertificate' },
  { type: 'bank_account_info', labelKey: 'sellerDocument.bankAccountInfo' },
  { type: 'contract', labelKey: 'sellerDocument.contract' },
] as const satisfies ReadonlyArray<{ type: string; labelKey: MessageKey }>;

/** Paydaş başına ön/arka kimlik belgesi türleri. */
export const IDENTITY_DOCUMENT_TYPES = {
  tckn: [
    { type: 'identity_front', labelKey: 'sellerDocument.identityFront' },
    { type: 'identity_back', labelKey: 'sellerDocument.identityBack' },
  ],
  passport: [
    { type: 'passport_front', labelKey: 'sellerDocument.passportFront' },
    { type: 'passport_back', labelKey: 'sellerDocument.passportBack' },
  ],
} as const satisfies Record<string, ReadonlyArray<{ type: string; labelKey: MessageKey }>>;

export const DOCUMENT_STATUS_CONFIG: Record<
  SellerDocumentStatus,
  { labelKey: MessageKey; color: string }
> = {
  pending: { labelKey: 'sellerDocument.statusPending', color: theme.colors.warning[600]! },
  approved: { labelKey: 'sellerDocument.statusApproved', color: theme.colors.success[600]! },
  rejected: { labelKey: 'sellerDocument.statusRejected', color: theme.colors.danger[600]! },
  revision_requested: { labelKey: 'sellerDocument.statusRevisionRequested', color: theme.colors.warning[600]! },
  appealed: { labelKey: 'sellerDocument.statusAppealed', color: theme.colors.info[600]! },
};

/** Backend: application/pdf + jpeg/png/webp, ≤10 MB. */
export const ACCEPTED_DOCUMENT_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Yükleme yalnız bu durumlarda AÇIK kalır (başvuru under_review olsa bile). */
export const REUPLOADABLE_STATUSES: SellerDocumentStatus[] = ['rejected', 'revision_requested'];
