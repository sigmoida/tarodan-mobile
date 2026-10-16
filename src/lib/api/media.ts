import { api } from './client';

/**
 * Medya yükleme. React Native için dosyalar şu formatta iletilir:
 *   { uri: string; name: string; type: string }
 * (Web'deki File ile eşdeğer davranır.)
 */
export type RNFile = { uri: string; name: string; type: string };

const appendRNFile = (formData: FormData, field: string, file: RNFile) => {
  // RN'in kendine özel FormData implementasyonu dosya objesini aşağıdaki şekilde kabul eder.
  // as any cast'i TS'in React Native FormData tiplerinin olmadığı durumlar için gerekli.
  formData.append(field, file as any);
};

/**
 * Tek ürün görselinin istek süresi. Global 30 sn (`client.ts`) mobil veride büyük bir
 * fotoğrafa yetmiyordu; sunucu da dosya başına moderasyon + iki sharp türevi + iki S3
 * PUT yapıyor. Global ayara dokunulmaz — yalnız bu istek uzun bekler.
 */
export const PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS = 120_000;

export type ProductImageUploadResult = {
  cardKey: string;
  detailKey: string;
  cardUrl?: string;
  detailUrl?: string;
};

export const mediaApi = {
  /**
   * TEK ürün görseli — dosya bazlı ilerleme ve iptal için (web `uploadProductImage`).
   * Eski toplu yükleme (tüm görseller tek istekte) kaldırıldı: bir dosyanın hatası hepsini
   * düşürüyor, dosya başına ilerleme/iptal/yeniden deneme mümkün olmuyordu.
   */
  uploadProductImage: (
    file: RNFile,
    options?: { signal?: AbortSignal; onProgress?: (percent: number) => void },
  ) => {
    const formData = new FormData();
    appendRNFile(formData, 'images', file);
    return api.post<ProductImageUploadResult[]>('/media/upload/product', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: PRODUCT_IMAGE_UPLOAD_TIMEOUT_MS,
      signal: options?.signal,
      onUploadProgress: (event) => {
        // `total` bilinmiyorsa yüzde uydurulmaz — sahte ilerleme gösterilmez.
        if (!options?.onProgress || !event.total) return;
        options.onProgress((event.loaded / event.total) * 100);
      },
    });
  },
  uploadAvatar: (file: RNFile) => {
    const formData = new FormData();
    appendRNFile(formData, 'avatar', file);
    return api.post('/media/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMessageImage: (file: RNFile) => {
    const formData = new FormData();
    appendRNFile(formData, 'file', file);
    return api.post<{ url: string; key?: string }>(
      '/media/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { folder: 'messages' },
      },
    );
  },
  /** İade talebi kanıt fotoğrafı — web ile parite: POST /media/upload?folder=reviews */
  uploadRefundEvidence: (file: RNFile) => {
    const formData = new FormData();
    appendRNFile(formData, 'file', file);
    return api.post<{ url: string; key?: string }>(
      '/media/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { folder: 'reviews' },
      },
    );
  },
  /**
   * Ürün görselini saat yönünde 90° çevirir (web `rotateProductImage`). Sunucu depodaki detay
   * türevini çevirip YENİ anahtarlar döner; sahiplik: kullanıcının geçici yükleme klasörü ya da
   * kendi ürününe bağlı anahtar (taze yüklenmiş ve kayıtlı görsellerin ikisi de çevrilebilir).
   */
  rotateProductImage: (detailKey: string) =>
    api.post<{ cardKey: string; detailKey: string; cardUrl: string; detailUrl: string }>(
      '/media/product-image/rotate',
      { detailKey },
    ),
  deleteFile: (key: string) => api.delete(`/media/file/${key}`),
};

// Upload API — backend `/media` modülüne yönlendirilmiş eski uyumluluk katmanı.
// Yeni kod `mediaApi` kullanmalı; bu wrapper geriye dönük çağrı dosyaları için bırakıldı.
export const uploadApi = {
  /** Tek resim yükle (genel — backend: POST /media/upload). */
  image: (formData: FormData) =>
    api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),
  /** Çoklu resim yükle (backend: POST /media/upload/multiple). */
  images: (formData: FormData) =>
    api.post('/media/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),
};
