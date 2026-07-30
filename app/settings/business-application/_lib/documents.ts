import { theme } from '@/ui';
import type { SellerDocumentStatus } from './types';

/** Zengin akışın 7 belge türü (web /profile/business ile birebir). */
export const DOCUMENT_TYPES = [
  { type: 'tax_plate', label: 'Vergi levhası' },
  { type: 'residence_or_invoice', label: 'İkametgâh veya fatura' },
  { type: 'signature_circular', label: 'İmza sirküleri' },
  { type: 'trade_registry_gazette', label: 'Ticaret sicil gazetesi' },
  { type: 'activity_certificate', label: 'Faaliyet belgesi' },
  { type: 'bank_account_info', label: 'Banka hesap bilgisi' },
  { type: 'contract', label: 'Sözleşme' },
] as const;

/** Paydaş başına ön/arka kimlik belgesi türleri. */
export const IDENTITY_DOCUMENT_TYPES = {
  tckn: [
    { type: 'identity_front', label: 'Kimlik ön yüz' },
    { type: 'identity_back', label: 'Kimlik arka yüz' },
  ],
  passport: [
    { type: 'passport_front', label: 'Pasaport ön yüz' },
    { type: 'passport_back', label: 'Pasaport arka yüz' },
  ],
} as const;

export const DOCUMENT_STATUS_CONFIG: Record<
  SellerDocumentStatus,
  { label: string; color: string }
> = {
  pending: { label: 'İncelemede', color: theme.colors.warning[600]! },
  approved: { label: 'Onaylandı', color: theme.colors.success[600]! },
  rejected: { label: 'Reddedildi', color: theme.colors.danger[600]! },
  revision_requested: { label: 'Düzeltme istendi', color: theme.colors.warning[600]! },
  appealed: { label: 'İtiraz edildi', color: theme.colors.info[600]! },
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
