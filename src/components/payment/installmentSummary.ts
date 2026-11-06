import type { TFunction } from 'i18next';
import type { PaymentInstallmentFields } from '@/types/installments';
import { formatPrice } from '@/utils/format';

/** One label / value line of a paid payment's installment details. */
export type InstallmentSummaryRow = { key: 'count' | 'fee' | 'charged'; label: string; value: string };

/**
 * The installment lines of a payment the payer sees (plan 6.2: success page, payment history,
 * order detail payment block): count, installment fee ("Vade farksız" when 0) and the amount
 * charged to the card. Empty for a single payment, an older API or a view without the fields
 * (the seller). Amounts are the server's (`PaymentInstallmentFields`); built at call time with `t`.
 */
export function installmentSummaryRows(
  fields: PaymentInstallmentFields | null | undefined,
  t: TFunction,
): InstallmentSummaryRow[] {
  const count = fields?.installmentCount;
  const charged = fields?.chargedAmount;
  if (typeof count !== 'number' || !Number.isInteger(count) || count <= 1) return [];
  if (typeof charged !== 'number' || !Number.isFinite(charged)) return [];
  const fee = typeof fields?.installmentFeeAmount === 'number' ? fields.installmentFeeAmount : null;
  return [
    { key: 'count', label: t('payment.summary.installments'), value: t('payment.installments.count', { count }) },
    ...(fee === null
      ? []
      : [
          {
            key: 'fee' as const,
            label: t('payment.summary.installmentFee'),
            value: fee > 0 ? formatPrice(fee) : t('payment.installments.noFee'),
          },
        ]),
    { key: 'charged', label: t('payment.summary.chargedTotal'), value: formatPrice(charged) },
  ];
}
