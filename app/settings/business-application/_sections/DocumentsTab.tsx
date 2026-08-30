import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Pressable } from 'react-native';
import { Text, Card, Button, theme } from '@/ui';
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
    <View style={{ gap: theme.spacing[2] }}>
      {DOCUMENT_TYPES.map((d) => {
        const doc = f.documentFor(d.type);
        const busy = upload.uploadingType === d.type;
        const status = doc ? DOCUMENT_STATUS_CONFIG[doc.status] : null;
        return (
          <Card key={d.type} testID={`doc-row-${d.type}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="semibold">{t(d.labelKey)}</Text>
                <Text variant="caption" color={status?.color ?? theme.colors.text.muted}>
                  {busy
                    ? t('sellerDocument.uploading')
                    : status
                      ? `${t(status.labelKey)}${doc?.version ? t('sellerDocument.versionSuffix', { version: doc.version }) : ''}`
                      : t('sellerDocument.notUploaded')}
                </Text>
              </View>
              <Pressable
                testID={`doc-upload-${d.type}`}
                disabled={busy || !f.canUpload(doc)}
                onPress={() => upload.pickAndUpload(d.type)}
              >
                <Text variant="body" color={theme.colors.primary[600]} style={{ fontWeight: '600' }}>
                  {doc ? t('common.replace') : t('sellerDocument.upload')}
                </Text>
              </Pressable>
            </View>

            {doc?.reviewNote ? (
              <Text variant="caption" color={theme.colors.danger[600]} style={{ marginTop: theme.spacing[1] }}>
                {doc.reviewNote}
              </Text>
            ) : null}

            {doc && REUPLOADABLE_STATUSES.includes(doc.status) ? (
              <Pressable
                testID={`doc-appeal-${d.type}`}
                onPress={() => setAppealDocumentId(doc.id)}
                style={{ marginTop: theme.spacing[1] }}
              >
                <Text variant="caption" color={theme.colors.primary[600]}>
                  {t('businessApplication.appealCta')}
                </Text>
              </Pressable>
            ) : null}
          </Card>
        );
      })}

      <Button
        testID="application-submit"
        onPress={f.submitApplication}
        isLoading={f.isSubmitting}
        disabled={f.isLocked}
      >
        {t('businessApplication.submitApplication')}
      </Button>

      <AppealModal documentId={appealDocumentId} onClose={() => setAppealDocumentId(null)} />
    </View>
  );
}
