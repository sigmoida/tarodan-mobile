import { StyleSheet, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import { Text, Button, SectionCard, EmptyState, SegmentedButtons, theme } from '@/ui';
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
    <>
      {f.stakeholders.length === 0 ? (
        <EmptyState
          icon="user-group"
          title={t('businessApplication.noStakeholdersTitle')}
          subtitle={t('businessApplication.noStakeholdersSubtitle')}
        />
      ) : (
        f.stakeholders.map((s) => (
          <SectionCard key={s.id} testID={`stakeholder-${s.id}`}>
            <Text variant="label">{s.fullName}</Text>
            <Text variant="caption" tone="muted">
              {s.identityType === 'tckn' ? t('businessApplication.identityTypeTckn') : t('businessApplication.identityTypePassport')}
              {s.identityNumber ? ` · ${s.identityNumber}` : ''}
            </Text>
            <View style={styles.docList}>
              {IDENTITY_DOCUMENT_TYPES[s.identityType].map((d) => {
                const doc = f.documentFor(d.type, s.id);
                const busy = upload.uploadingType === d.type + s.id;
                return (
                  <Pressable
                    key={d.type}
                    testID={`stakeholder-doc-${s.id}-${d.type}`}
                    disabled={busy || !f.canUpload(doc)}
                    onPress={() => upload.pickAndUpload(d.type, s.id)}
                    style={styles.docRow}
                  >
                    <Text variant="bodySm">{t(d.labelKey)}</Text>
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
          </SectionCard>
        ))
      )}

      <SectionCard title={t('businessApplication.addStakeholderTitle')} bodyStyle={styles.form}>
        <Form form={f.stakeholderForm}>
          <FormInput testID="stakeholder-fullName" name="fullName" label={t('businessApplication.fullNameLabel')} editable={!f.isLocked} />
          <Controller
            control={f.stakeholderForm.control}
            name="identityType"
            render={({ field }) => (
              <View style={styles.identityType}>
                <Text variant="label" style={styles.identityTypeLabel}>{t('businessApplication.identityTypeLabel')}</Text>
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
      </SectionCard>
    </>
  );
}

const styles = StyleSheet.create({
  docList: { gap: theme.spacing[2], marginTop: theme.spacing[2] },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: theme.minTouchTarget,
  },
  form: { gap: theme.spacing[3] },
  identityType: { marginBottom: theme.spacing[3] },
  identityTypeLabel: { marginBottom: theme.spacing[1] },
});
