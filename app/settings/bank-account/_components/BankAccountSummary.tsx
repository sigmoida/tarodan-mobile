import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, SectionCard, Text } from '@/ui';
import { formatLongDate } from '@/utils/format';
import { maskIban } from '@/utils/iban';
import { styles } from '../_lib/styles';

export interface BankAccountSummaryProps {
  iban: string;
  accountHolder: string;
  /** API `updatedAt` (ISO); yoksa ya da geçersizse "son güncelleme" satırı çizilmez. */
  updatedAt?: string | null;
}

/**
 * Kayıtlı hesabın kalıcı özeti (kayıt anlaşılsın diye): "Kayıtlı" rozeti, maskeli IBAN,
 * hesap sahibi ve son güncelleme tarihi. IBAN yoksa `null` çizilir.
 */
export function BankAccountSummary({ iban, accountHolder, updatedAt }: BankAccountSummaryProps) {
  const { t } = useTranslation();
  if (!iban) return null;

  const lastUpdated = formatLongDate(updatedAt, t('common.dateLocale'));

  return (
    <SectionCard testID="bank-account-summary" style={styles.summary}>
      <View style={styles.summaryHeader}>
        <Text variant="body" weight="semibold" style={styles.summaryIban}>
          {maskIban(iban)}
        </Text>
        <Badge variant="success" size="sm">
          {t('bankAccount.savedBadge')}
        </Badge>
      </View>
      <Text variant="body">{accountHolder}</Text>
      {lastUpdated ? (
        <Text variant="bodySm" tone="muted" style={styles.summaryDate}>
          {t('bankAccount.lastUpdated', { date: lastUpdated })}
        </Text>
      ) : null}
    </SectionCard>
  );
}
