import { useMutation } from '@tanstack/react-query';
import { mediaApi } from '@/lib/api';
import { withPreparedImage, type LocalImageFile } from '@/lib/media';
import { captureException } from '@/services/sentry';

/**
 * Kanıt fotoğraflarını yükler, URL'lerini döner (iade ekranı sahiplenir).
 *
 * URL döndürmeyen bir yükleme HATADIR: eskiden sessizce eleniyor, talep kanıtsız
 * gidip sunucudan `400 evidenceRequired` alıyordu. Hepsi ya da hiçbiri — bir
 * fotoğraf bile URL'siz gelirse mutasyon düşer; geri bildirim yok, ekran hatayı
 * kanıt alanının altında gösterir (talep gönderilmez).
 *
 * Her fotoğraf yüklemeden önce küçültülür (≤1600 px JPEG; hazırlama seri, yüklemeler paralel)
 * ve hazırlanmış geçici dosya yükleme bitince silinir.
 */
export function useUploadRefundEvidence(orderId: string) {
  return useMutation({
    mutationFn: async (files: LocalImageFile[]): Promise<string[]> => {
      const results = await Promise.all(
        files.map((file) =>
          // `strict`: hazırlanamayan fotoğrafın HAM orijinali (EXIF/konum, "jpeg" etiketli HEIC)
          // yüklenmez — mutasyon düşer, ekran mevcut "yüklenemedi" hatasını gösterir.
          withPreparedImage(file, (prepared) => mediaApi.uploadRefundEvidence(prepared), {
            strict: true,
          }),
        ),
      );
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
