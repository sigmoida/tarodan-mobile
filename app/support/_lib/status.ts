import type { TFunction } from 'i18next';
import {
  resolveStatusConfig,
  ticketStatusConfig,
  type StatusConfig,
  type StatusConfigDefMap,
} from '@/lib/shared/status-configs';

/**
 * Destek talebi durumu — TEK kaynak (liste + detay iki ayrı kopya tutuyordu).
 * Renk rolü web `ticketStatusConfig` varyantından gelir. Etiket müşteriye dönük
 * `support.*` anahtarlarıdır (web /support sayfasındaki "Yanıtınız Bekleniyor",
 * "Kapatıldı" kelimeleriyle aynı; `status.ticket.*` yönetici dilidir).
 */
const ticketStatusMeta: StatusConfigDefMap = {
  open: { labelKey: 'support.open', variant: ticketStatusConfig.open!.variant },
  in_progress: { labelKey: 'support.inProgress', variant: ticketStatusConfig.in_progress!.variant },
  waiting_customer: {
    labelKey: 'support.waitingCustomer',
    variant: ticketStatusConfig.waiting_customer!.variant,
  },
  resolved: { labelKey: 'support.resolved', variant: ticketStatusConfig.resolved!.variant },
  closed: { labelKey: 'support.closed', variant: ticketStatusConfig.closed!.variant },
};

export const buildTicketStatusConfig = (t: TFunction): Record<string, StatusConfig> =>
  resolveStatusConfig(ticketStatusMeta, (key) => t(key));
