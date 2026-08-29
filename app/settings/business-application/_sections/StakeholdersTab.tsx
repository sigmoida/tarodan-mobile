import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import { Text, Button, Card, EmptyState, SegmentedButtons, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { IDENTITY_DOCUMENT_TYPES, DOCUMENT_STATUS_CONFIG } from '../_lib/documents';
import type { useBusinessApplication } from '../_hooks/useBusinessApplication';
import type { useDocumentUpload } from '../_hooks/useDocumentUpload';

type Props = {
  f: ReturnType<typeof useBusinessApplication>;
  upload: ReturnType<typeof useDocumentUpload>;
};

/** Şirket sahipleri/ortakları + paydaş başına ön/arka kimlik yüklemesi. */
export function StakeholdersTab({ f, upload }: Props) {
  const { t } = useTranslation();
  if (f.tab !== 'stakeholders') return null;

  return (
    <View style={{ gap: theme.spacing[4] }}>
      {f.stakeholders.length === 0 ? (
        <EmptyState
          title={t('businessApplication.noStakeholdersTitle')}
          subtitle={t('businessApplication.noStakeholdersSubtitle')}
        />
      ) : (
        f.stakeholders.map((s) => (
          <Card key={s.id} testID={`stakeholder-${s.id}`}>
            <Text variant="body" weight="semibold">{s.fullName}</Text>
            <Text variant="caption" tone="muted">
              {s.identityType === 'tckn' ? t('businessApplication.identityTypeTckn') : t('businessApplication.identityTypePassport')}
              {s.identityNumber ? ` · ${s.identityNumber}` : ''}
            </Text>
            <View style={{ gap: theme.spacing[2], marginTop: theme.spacing[2] }}>
              {IDENTITY_DOCUMENT_TYPES[s.identityType].map((d) => {
                const doc = f.documentFor(d.type, s.id);
                const busy = upload.uploadingType === d.type + s.id;
                return (
                  <Pressable
                    key={d.type}
                    testID={`stakeholder-doc-${s.id}-${d.type}`}
                    disabled={busy || !f.canUpload(doc)}
                    onPress={() => upload.pickAndUpload(d.type, s.id)}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: theme.spacing[2],
                    }}
                  >
                    <Text variant="body">{t(d.labelKey)}</Text>
                    <Text
                      variant="caption"
                      color={doc ? DOCUMENT_STATUS_CONFIG[doc.status].color : theme.colors.text.muted}
                    >
                      {busy ? t('sellerDocument.uploading') : doc ? t(DOCUMENT_STATUS_CONFIG[doc.status].labelKey) : t('sellerDocument.upload')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ))
      )}

      <Card>
        <Text variant="h3">{t('businessApplication.addStakeholderTitle')}</Text>
        <Form form={f.stakeholderForm}>
          <FormInput testID="stakeholder-fullName" name="fullName" label={t('businessApplication.fullNameLabel')} editable={!f.isLocked} />
          <Controller
            control={f.stakeholderForm.control}
            name="identityType"
            render={({ field }) => (
              <View style={{ marginBottom: theme.spacing[3] }}>
                <Text variant="label" style={{ marginBottom: theme.spacing[1] }}>{t('businessApplication.identityTypeLabel')}</Text>
                <SegmentedButtons
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    { value: 'tckn', label: t('businessApplication.identityTypeTckn') },
                    { value: 'passport', label: t('businessApplication.identityTypePassport') },
                  ]}
                />
              </View>
            )}
          />
          <FormInput testID="stakeholder-identityNumber" name="identityNumber" label={t('businessApplication.identityNumberLabel')} keyboardType="number-pad" editable={!f.isLocked} />
        </Form>
        <Button testID="stakeholder-add" onPress={f.addStakeholder} isLoading={f.isAddingStakeholder} disabled={f.isLocked}>
          {t('common.add')}
        </Button>
      </Card>
    </View>
  );
}
