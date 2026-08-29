import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Alert, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import type { useBusinessApplication } from '../_hooks/useBusinessApplication';

type Props = { f: ReturnType<typeof useBusinessApplication> };

/** Şirket ve banka bilgileri. `under_review` iken tüm alanlar devre dışı. */
export function DetailsTab({ f }: Props) {
  const { t } = useTranslation();
  if (f.tab !== 'details') return null;
  const disabled = f.isLocked;

  return (
    <View style={{ gap: theme.spacing[4] }}>
      {disabled && (
        <Alert variant="info" title={t('businessApplication.lockedTitle')}>
          {t('businessApplication.lockedBody')}
        </Alert>
      )}
      <Form form={f.detailsForm}>
        <FormInput testID="details-companyType" name="companyType" label={t('businessApplication.companyTypeLabel')} editable={!disabled} />
        <FormInput testID="details-taxId" name="taxId" label={t('businessApplication.taxIdLabel')} keyboardType="number-pad" editable={!disabled} />
        <FormInput testID="details-taxOffice" name="taxOffice" label={t('businessApplication.taxOfficeLabel')} editable={!disabled} />
        <FormInput testID="details-companyCity" name="companyCity" label={t('address.city')} editable={!disabled} />
        <FormInput testID="details-companyDistrict" name="companyDistrict" label={t('address.district')} editable={!disabled} />
        <FormInput testID="details-bankAccountHolder" name="bankAccountHolder" label={t('businessApplication.accountHolderLabel')} editable={!disabled} />
        <FormInput testID="details-iban" name="iban" label={t('businessApplication.ibanLabel')} placeholder="TR..." autoCapitalize="characters" editable={!disabled} />
      </Form>
      <Button testID="details-save" onPress={f.saveDetails} isLoading={f.isSavingDetails} disabled={disabled}>
        {t('businessApplication.saveDetails')}
      </Button>
    </View>
  );
}
