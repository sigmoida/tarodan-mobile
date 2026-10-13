import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text, Button, SectionCard, theme } from '@/ui';
import { DOCUMENT_TYPES, DOCUMENT_STATUS_CONFIG, REUPLOADABLE_STATUSES } from '../_lib/documents';
import { AppealModal } from '../_modals/AppealModal';
import type { useBusinessApplication } from '../_hooks/useBusinessApplication';
import type { useDocumentUpload } from '../_hooks/useDocumentUpload';

type Props = {
  f: ReturnType<typeof useBusinessApplication>;
  upload: ReturnType<typeof useDocumentUpload>;
};

/** 7 belge türü; durum, sürüm, inceleme notu ve itiraz aksiyonu. */
export function DocumentsTab({ f, upload }: Props) {
  const { t } = useTranslation();
  const [appealDocumentId, setAppealDocumentId] = useState<string | null>(null);
  if (f.tab !== 'documents') return null;

  return (
    <>
      <SectionCard title={t('businessApplication.tabDocuments')} bodyStyle={styles.list}>
        {DOCUMENT_TYPES.map((d) => {
          const doc = f.documentFor(d.type);
          const busy = upload.uploadingType === d.type;
          const status = doc ? DOCUMENT_STATUS_CONFIG[doc.status] : null;
          return (
            <View key={d.type} testID={`doc-row-${d.type}`} style={styles.row}>
              <View style={styles.rowHead}>
                <View style={styles.rowText}>
                  <Text variant="label">{t(d.labelKey)}</Text>
                  <Text variant="caption" color={status?.color ?? theme.colors.text.muted}>
                    {busy
                      ? t('sellerDocument.uploading')
                      : status
                        ? `${t(status.labelKey)}${doc?.version ? t('sellerDocument.versionSuffix', { version: doc.version }) : ''}`
                        : t('sellerDocument.notUploaded')}
                  </Text>
                </View>
                <Button
                  testID={`doc-upload-${d.type}`}
                  variant="outline"
                  size="sm"
                  title={doc ? t('common.replace') : t('sellerDocument.upload')}
                  disabled={busy || !f.canUpload(doc)}
                  onPress={() => upload.pickAndUpload(d.type)}
                />
              </View>

              {doc?.reviewNote ? (
                <Text variant="caption" tone="danger">
                  {doc.reviewNote}
                </Text>
              ) : null}

              {doc && REUPLOADABLE_STATUSES.includes(doc.status) ? (
                <Button
                  testID={`doc-appeal-${d.type}`}
                  variant="link"
                  size="sm"
                  title={t('businessApplication.appealCta')}
                  onPress={() => setAppealDocumentId(doc.id)}
                />
              ) : null}
            </View>
          );
        })}
      </SectionCard>

      <Button
        testID="application-submit"
        onPress={f.submitApplication}
        isLoading={f.isSubmitting}
        disabled={f.isLocked}
      >
        {t('businessApplication.submitApplication')}
      </Button>

      <AppealModal documentId={appealDocumentId} onClose={() => setAppealDocumentId(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing[3] },
  row: {
    gap: theme.spacing[1],
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radiusRole.card,
    padding: theme.spacing[3],
  },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing[3] },
  rowText: { flex: 1, gap: theme.spacing[0.5] },
});
