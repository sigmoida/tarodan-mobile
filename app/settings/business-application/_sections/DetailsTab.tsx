import { View } from 'react-native';
import { Button, Alert, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import type { useBusinessApplication } from '../_hooks/useBusinessApplication';

type Props = { f: ReturnType<typeof useBusinessApplication> };

/** Şirket ve banka bilgileri. `under_review` iken tüm alanlar devre dışı. */
export function DetailsTab({ f }: Props) {
  if (f.tab !== 'details') return null;
  const disabled = f.isLocked;

  return (
    <View style={{ gap: theme.spacing[4] }}>
      {disabled && (
        <Alert variant="info" title="Başvuru incelemede">
          Bilgiler inceleme sürerken değiştirilemez. Reddedilen belgeleri yeniden
          yükleyebilirsiniz.
        </Alert>
      )}
      <Form form={f.detailsForm}>
        <FormInput testID="details-companyType" name="companyType" label="Şirket türü" editable={!disabled} />
        <FormInput testID="details-taxId" name="taxId" label="Vergi numarası" keyboardType="number-pad" editable={!disabled} />
        <FormInput testID="details-taxOffice" name="taxOffice" label="Vergi dairesi" editable={!disabled} />
        <FormInput testID="details-companyCity" name="companyCity" label="İl" editable={!disabled} />
        <FormInput testID="details-companyDistrict" name="companyDistrict" label="İlçe" editable={!disabled} />
        <FormInput testID="details-bankAccountHolder" name="bankAccountHolder" label="Hesap sahibi" editable={!disabled} />
        <FormInput testID="details-iban" name="iban" label="IBAN" placeholder="TR..." autoCapitalize="characters" editable={!disabled} />
      </Form>
      <Button testID="details-save" onPress={f.saveDetails} isLoading={f.isSavingDetails} disabled={disabled}>
        Bilgileri kaydet
      </Button>
    </View>
  );
}
