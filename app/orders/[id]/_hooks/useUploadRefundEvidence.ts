import { useMutation } from '@tanstack/react-query';
import { mediaApi, type RNFile } from '@/lib/api';
import { captureException } from '@/services/sentry';

/**
 * Kanıt fotoğraflarını yükler, URL'lerini döner (RefundRequestModal sahiplenir).
 *
 * URL döndürmeyen bir yükleme HATADIR: eskiden sessizce eleniyor, talep kanıtsız
 * gidip sunucudan `400 evidenceRequired` alıyordu. Hepsi ya da hiçbiri — bir
 * fotoğraf bile URL'siz gelirse mutasyon düşer; geri bildirim yok, modal hatayı
 * kendi içinde gösterir (yükleme modal AÇIKKEN yapılır, talep gönderilmez).
 */
export function useUploadRefundEvidence(orderId: string) {
  return useMutation({
    mutationFn: async (files: RNFile[]): Promise<string[]> => {
      const results = await Promise.all(files.map((file) => mediaApi.uploadRefundEvidence(file)));
      const urls = results.map((r) => r?.data?.url);
      const missing = urls.filter((u) => typeof u !== 'string' || u.length === 0).length;
      if (missing > 0) {
        throw new Error(`refund evidence upload returned no url (${missing}/${files.length})`);
      }
      return urls as string[];
    },
    onError: (err: unknown, files) => {
      captureException(err, {
        level: 'error',
        tags: { flow: 'refund.evidenceUpload' },
        extra: { orderId, count: files.length },
      });
    },
  });
}
