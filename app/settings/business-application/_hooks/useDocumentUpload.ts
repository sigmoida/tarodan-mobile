import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { sellerDocumentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { ACCEPTED_DOCUMENT_MIME, MAX_DOCUMENT_BYTES } from '../_lib/documents';

/**
 * Kurumsal belge yükleme. PDF gerektiği için görsel seçici DEĞİL belge seçici
 * kullanılır. Sunucu AI moderasyon reddinde Türkçe mesajı olduğu gibi gösterir.
 */
export function useDocumentUpload() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  async function pickAndUpload(documentType: string, stakeholderId?: string) {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_DOCUMENT_MIME,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled) return;
    const asset = picked.assets?.[0];
    if (!asset) return;

    if (typeof asset.size === 'number' && asset.size > MAX_DOCUMENT_BYTES) {
      appAlert(t('businessApplication.fileTooLargeTitle'), t('businessApplication.fileTooLargeBody'));
      return;
    }

    setUploadingType(documentType + (stakeholderId ?? ''));
    try {
      await sellerDocumentsApi.upload(
        documentType,
        {
          uri: asset.uri,
          name: asset.name ?? 'belge',
          type: asset.mimeType ?? 'application/octet-stream',
        },
        stakeholderId,
      );
      queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.list });
      queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.application });
      appAlert(t('businessApplication.documentUploadedTitle'), t('businessApplication.documentUploadedBody'));
    } catch (e) {
      const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      appAlert(
        t('businessApplication.documentUploadFailedTitle'),
        Array.isArray(raw) ? raw.join('\n') : raw || t('businessApplication.documentUploadFailed'),
      );
    } finally {
      setUploadingType(null);
    }
  }

  return { pickAndUpload, uploadingType };
}
