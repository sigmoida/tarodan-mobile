import type { TFunction } from 'i18next';

export interface TicketSummary {
  id: string;
  ticketNumber?: string;
  subject: string;
  category: string;
  status: string;
  createdAt?: string;
  messageCount?: number;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  isInternal?: boolean;
  createdAt?: string;
}

export interface TicketDetail extends TicketSummary {
  creatorId: string;
  messages?: TicketMessage[];
}

// Backend TicketCategory enum'u ile birebir. Liste ve detay aynı etiketleri kullanır (tek kaynak).
export const buildCategoryLabels = (t: TFunction): Record<string, string> => ({
  shipping: t('support.category.shipping'),
  payment: t('support.category.payment'),
  account: t('support.category.account'),
  product: t('support.category.product'),
  trade: t('support.category.trade'),
  technical: t('support.category.technical'),
  other: t('support.category.other'),
});

export function formatTicketDate(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

export function formatTicketDateTime(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
