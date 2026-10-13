import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Button, Card, Text, Snackbar } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { ScreenHeader } from '@/components/common';
import { formatIbanDisplay, normalizeIban } from '@/utils/iban';
import { useBankAccount } from './_bank-account/_hooks/useBankAccount';
import { styles } from './_bank-account/_lib/styles';

/**
 * Banka hesabı (satıcı ödemeleri) — ince ekran. Sorgu, form, kaydet/sil ve
 * kaydetmeden önceki yasal kimlik kapısı `useBankAccount`'ta.
 */
export default function BankAccountScreen() {
  const { t } = useTranslation();
  const f = useBankAccount();

  if (!f.isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text variant="h3">{t('auth.loginToContinue')}</Text>
        <Button
          variant="primary"
          title={t('auth.loginTitle')}
          onPress={() => router.push('/(auth)/login')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('mobile.settingsBankAccount')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Text variant="bodySm" style={styles.hint}>
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

          <Button
            testID="bank-account-submit-button"
            variant="primary"
            fullWidth
            title={f.existing ? t('discount.update') : t('common.save')}
            onPress={f.onSubmit}
            isLoading={f.isSaving}
            disabled={f.isSaving}
            style={styles.submitButton}
          />

          {f.existing && (
            <Button
              testID="bank-account-delete-button"
              variant="ghost"
              fullWidth
              title={t('bankAccount.deleteTitle')}
              onPress={f.confirmDelete}
              style={styles.deleteButton}
            />
          )}
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Snackbar
        visible={f.snackbar.visible}
        onDismiss={f.dismissSnackbar}
        duration={3000}
        variant={f.snackbar.variant ?? 'default'}
      >
        {f.snackbar.message}
      </Snackbar>
    </View>
  );
}
