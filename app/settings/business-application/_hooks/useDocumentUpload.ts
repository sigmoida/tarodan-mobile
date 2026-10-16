import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { appAlert, toast } from '@/ui';
import { sellerDocumentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { IMAGE_PROFILES, isReencodableImage, withPreparedImage } from '@/lib/media';
import { ACCEPTED_DOCUMENT_MIME, MAX_DOCUMENT_BYTES } from '../_lib/documents';

/** Hazırlama atlandı ve dosya sınırı aşıyor — kullanıcıya "dosya çok büyük" gösterilir. */
const FILE_TOO_LARGE = new Error('FILE_TOO_LARGE');

/**
 * Kurumsal belge yükleme. PDF gerektiği için görsel seçici DEĞİL belge seçici
 * kullanılır. Sunucu AI moderasyon reddinde Türkçe mesajı olduğu gibi gösterir.
 *
 * Belge FOTOĞRAFI (JPEG) yüklemeden önce `document` profiliyle küçültülür (yönetici okuyacağı
 * için ≤2400 px, yüksek kalite); PDF/PNG/WebP'ye dokunulmaz. 10 MB sınırı küçültülemeyen
 * dosyada hemen, küçültülebilecek fotoğrafta hazırlamadan SONRA (atlandıysa) uygulanır.
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

    const file = {
      uri: asset.uri,
      name: asset.name ?? 'belge',
      type: asset.mimeType ?? 'application/octet-stream',
    };
    const oversize = typeof asset.size === 'number' && asset.size > MAX_DOCUMENT_BYTES;
    const alertTooLarge = () =>
      appAlert(t('businessApplication.fileTooLargeTitle'), t('businessApplication.fileTooLargeBody'));
    if (oversize && !isReencodableImage(file.type)) {
      alertTooLarge();
      return;
    }

    setUploadingType(documentType + (stakeholderId ?? ''));
    try {
      await withPreparedImage(
        file,
        async (prepared) => {
          // Küçültme yapılamadı (manipulator yok / süre doldu): büyük dosya sunucuya gitmez.
          if (oversize && !prepared.temporary) throw FILE_TOO_LARGE;
          await sellerDocumentsApi.upload(
            documentType,
            { uri: prepared.uri, name: prepared.name, type: prepared.type },
            stakeholderId,
          );
        },
        IMAGE_PROFILES.document,
      );
      queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.list });
      queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.application });
      toast.success(t('businessApplication.documentUploadedBody'));
    } catch (e) {
      if (e === FILE_TOO_LARGE) {
        alertTooLarge();
        return;
      }
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
