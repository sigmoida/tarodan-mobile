import { useTranslation } from 'react-i18next';
import { Button, SectionCard, Text } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { PageShell } from '@/components/common/PageShell';
import { formatIbanDisplay, normalizeIban } from '@/utils/iban';
import { BankAccountSummary } from './_components/BankAccountSummary';
import { useBankAccount } from './_hooks/useBankAccount';
import { styles } from './_lib/styles';

/**
 * Banka hesabı (satıcı ödemeleri) — ince ekran: PageShell + tek SectionCard, sabit alt barda
 * Kaydet. Sorgu, form, kaydet/sil ve kaydetmeden önceki yasal kimlik kapısı `useBankAccount`'ta.
 */
export default function BankAccountScreen() {
  const { t } = useTranslation();
  const f = useBankAccount();
  const title = t('mobile.settingsBankAccount');

  if (!f.isAuthenticated) {
    return <AuthGatePage title={title} icon="credit-card" subtitle={t('auth.loginToContinue')} />;
  }

  return (
    <PageShell
      title={title}
      loading={f.isLoading}
      error={f.loadError}
      onRetry={() => f.refetch()}
      footer={
        <Button
          testID="bank-account-submit-button"
          variant="primary"
          size="lg"
          fullWidth
          title={f.account ? t('discount.update') : t('common.save')}
          onPress={f.onSubmit}
          isLoading={f.isSaving}
          disabled={f.isSaving}
        />
      }
    >
      {f.account ? (
        <BankAccountSummary
          iban={f.account.iban}
          accountHolder={f.account.accountHolder}
          updatedAt={f.account.updatedAt}
        />
      ) : null}
      <SectionCard>
        <Text variant="bodySm" tone="muted" style={styles.hint}>
          {t('bankAccount.payoutHint')}
        </Text>

        <Form form={f.form}>
          <FormInput
            name="accountHolder"
            testID="bank-account-holder-input"
            label={t('bankAccount.holderLabel')}
            containerStyle={styles.input}
          />
          <FormInput
            name="iban"
            testID="bank-account-iban-input"
            label="IBAN *"
            transform={(text) => formatIbanDisplay(normalizeIban(text).slice(0, 26))}
            placeholder="TR.. .... .... ...."
            autoCapitalize="characters"
            maxLength={32}
            containerStyle={styles.input}
          />
          <FormInput
            name="taxId"
            label={t('bankAccount.taxIdOptional')}
            transform={(text) => text.slice(0, 20)}
            containerStyle={styles.input}
          />
        </Form>

        {f.account && (
          <Button
            testID="bank-account-delete-button"
            variant="ghost"
            fullWidth
            title={t('bankAccount.deleteTitle')}
            onPress={f.confirmDelete}
            style={styles.deleteButton}
          />
        )}
      </SectionCard>
    </PageShell>
  );
}
