import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { appAlert, toast } from '@/ui';
import { mediaApi } from '@/lib/api';
import { apiErrorLines } from '@/lib/api/errorText';
import { useLatestRef } from '@/hooks/useLatestRef';

import {
  applyUploadEvent,
  hasPendingUploads,
  imageFromFile,
  imageSubmitBlocker,
  makeCoverById,
  moveImageById,
  patchImage,
  removeImageById,
  rotatedPreviewUri,
  shiftImageById,
  toImageKeys,
  type ListingImage,
} from '../_lib/images';
import {
  abortError,
  createUploadQueue,
  type QueueEvent,
  type UploadPort,
  type UploadQueue,
} from '../_lib/uploadQueue';
import { createPreparer, type LocalImageFile } from '../_lib/prepareImage';
import { MIN_IMAGE_BYTES } from '../_lib/constants';

/** Varsayılan kontenjan (üyelik limiti okunamadıysa) — eski davranışla aynı. */
const DEFAULT_MAX_IMAGES = 5;

/** Picker varlığı → yüklenecek yerel dosya. */
function toLocalFile(asset: ImagePicker.ImagePickerAsset, index: number): LocalImageFile {
  return {
    uri: asset.uri,
    name: asset.fileName || `image_${Date.now()}_${index}.jpg`,
    type: asset.mimeType || 'image/jpeg',
    width: asset.width || undefined,
    height: asset.height || undefined,
  };
}

/**
 * Hazırlama (küçült/sıkıştır) tek tek — tam çözünürlüklü çözme bellek açısından ağır — ama
 * süre sınırlı (20 sn → orijinal) ve iptal edilebilir; takılan bir görsel sırayı kilitlemez.
 */
const prepareForUpload = createPreparer();

/**
 * Üretim portu: hazırla (fotoğraf ≤1600 px JPEG) → dosya başına tek istek (ilerleme + iptal +
 * 120 sn). Sunucu dizi döndürür; tek dosyada ilk eleman sonuçtur.
 */
const defaultUpload: UploadPort = async (file, { signal, onProgress }) => {
  const prepared = await prepareForUpload(file, signal);
  if (signal.aborted) throw abortError();
  const res = await mediaApi.uploadProductImage(
    {
      // iOS FormData `file://` önekisiz yolu bekliyor (eski toplu yüklemeyle aynı).
      uri: Platform.OS === 'android' ? prepared.uri : prepared.uri.replace('file://', ''),
      name: prepared.name,
      type: prepared.type,
    },
    { signal, onProgress },
  );
  const [result] = Array.isArray(res.data) ? res.data : [res.data];
  if (!result?.cardKey || !result?.detailKey) throw new Error('NO_SERVER_RESULT');
  return {
    cardKey: result.cardKey,
    detailKey: result.detailKey,
    url: result.cardUrl || result.detailUrl || undefined,
  };
};

interface Params {
  /** Üyeliğe göre izin verilen görsel adedi. */
  maxImages?: number;
  /** Testler için değiştirilebilir yükleme portu. */
  upload?: UploadPort;
}

/**
 * İlan görsellerinin seçme/yükleme/sıralama durumu (web `useListingImageUpload` karşılığı).
 *
 * Seçer seçmez her görsel YEREL önizlemesiyle listeye girer ve kuyruğa alınır (dosya başına
 * bir istek, en fazla 3 paralel); karo ilerlemeyi gösterir, biten kalem sunucu anahtarlarına
 * geçer, hata alan kalem yalnız kendini etkiler (yeniden dene / kaldır). Payload yalnız sunucu
 * anahtarlı kalemlerden türetilir (`imageKeys`); bekleyen/hatalı kalem varken
 * `submitBlocker` gönderimi engeller. Ekran kapanınca uçuştaki istekler iptal edilir.
 */
export function useListingImageUpload({ maxImages: maxImagesParam, upload }: Params = {}) {
  const { t } = useTranslation();
  const maxImages = maxImagesParam || DEFAULT_MAX_IMAGES;

  // Görseller: TEK liste (ekran sırası = payload sırası, ilk = kapak).
  const [images, setImages] = useState<ListingImage[]>([]);
  /**
   * Her yazım bu ref üzerinden: kuyruk olayları ve kullanıcı işlemleri aynı turda art arda
   * gelebilir; ref'ten hesaplanan sonraki liste hiçbir güncellemeyi ezmez.
   */
  const imagesRef = useRef<ListingImage[]>(images);
  const update = useCallback((fn: (prev: ListingImage[]) => ListingImage[]) => {
    const next = fn(imagesRef.current);
    if (next === imagesRef.current) return;
    imagesRef.current = next;
    setImages(next);
  }, []);

  const imageKeys = useMemo(() => toImageKeys(images), [images]);
  /** Çevirmesi süren kalemler — aynı karedeki ikinci dokunuş state'i görmeden kesilir. */
  const rotatingIdsRef = useRef(new Set<string>());
  /** Picker açıkken ikinci dokunuş ikinci bir picker açmasın. */
  const pickingRef = useRef(false);
  /** Görsel sürükleniyor: form ScrollView'ı kaydırmayı bırakır (iki hareket çatışmasın). */
  const [imageDragActive, setImageDragActive] = useState(false);
  // Sürüklenecek ikinci görsel kalmadıysa kilit kalkar — sürükleme yarıda kesilip bitiş
  // bildirimi gelmezse form kaydırması kalıcı kilitli kalmasın.
  useEffect(() => {
    if (images.length < 2) setImageDragActive(false);
  }, [images.length]);

  // Kuyruk bir KEZ kurulur: her render'da yeniden yaratılırsa aktif istekler ve iptal
  // denetleyicileri kaybolurdu. Port ve çevirici ref'ten okunur (bayat kapanış yok).
  const uploadRef = useLatestRef(upload ?? defaultUpload);
  const tRef = useLatestRef(t);
  const queueRef = useRef<UploadQueue | null>(null);
  if (!queueRef.current) {
    queueRef.current = createUploadQueue({
      upload: (file, options) => uploadRef.current(file, options),
      onEvent: (event: QueueEvent) => {
        const tr = tRef.current;
        const errorText =
          event.status === 'failed'
            ? (event.error instanceof Error && event.error.message === 'NO_SERVER_RESULT'
                ? tr('product.imageUpload.noServerResult')
                : apiErrorLines(event.error)[0]) || tr('product.imageUpload.failed')
            : undefined;
        update((prev) => applyUploadEvent(prev, event, errorText));
      },
    });
  }
  const queue = queueRef.current;

  // Ekran kapanınca uçuştaki ve sıradaki istekler iptal edilir.
  useEffect(() => () => queue.cancelAll(), [queue]);

  /** Listeyi dışarıdan kur (düzenleme prefill'i / 409 tazeleme / sıfırlama) — süren yüklemeler iptal. */
  const replaceImages = useCallback(
    (next: ListingImage[]) => {
      queue.cancelAll();
      rotatingIdsRef.current.clear();
      update(() => next);
    },
    [queue, update],
  );

  const pickImages = async () => {
    if (pickingRef.current) return;
    const remaining = maxImages - imagesRef.current.length;
    if (remaining <= 0) {
      appAlert(t('listing.imageLimitTitle'), t('product.maxImagesReached'));
      return;
    }
    pickingRef.current = true;
    let assets: ImagePicker.ImagePickerAsset[];
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        appAlert(t('order.permissionRequired'), t('order.galleryPermissionBody'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        // Çözünürlüğü düşürmez; asıl küçültme `prepareImageForUpload`'ta. JPEG kalır ki
        // hazırlama atlanırsa (zaman aşımı, işlem hatası, yeniden derlenmemiş dev-client)
        // sunucu dosyayı yine kabul etsin (HEIC değil).
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) return;
      assets = result.assets;
    } finally {
      pickingRef.current = false;
    }

    /**
     * 1 KB altı dosyalar elenir — boş/bozuk kayıtlar ve galeri yer tutucuları buradan geliyor.
     *
     * ⚠️ Bu YALNIZCA istemci kuralı: sunucuda alt sınır YOK (`media.service.ts` yalnız 10 MB
     * üst sınırına bakar). Sınır kalite için; web aynı kuralı 2026-08-15'te koydu.
     * `fileSize` her platformda gelmiyor; GELMEYEN dosya elenmez — bilmediğimiz için
     * reddetmek, kullanıcının geçerli fotoğrafını sessizce düşürmek olurdu.
     */
    const picked = assets.slice(0, Math.max(0, maxImages - imagesRef.current.length));
    const accepted = picked.filter((a) => typeof a.fileSize !== 'number' || a.fileSize >= MIN_IMAGE_BYTES);
    const skipped = picked.length - accepted.length;
    if (accepted.length === 0) {
      if (skipped > 0) appAlert(t('listing.imageTooSmallTitle'), t('listing.imageAllTooSmall'));
      return;
    }
    if (skipped > 0) {
      appAlert(t('listing.imageTooSmallTitle'), t('listing.imageTooSmallBody', { count: skipped }));
    }

    // Seçer seçmez yerel önizlemeyle listeye gir, sonra kuyruğa al.
    const added = accepted.map((asset, i) => imageFromFile(toLocalFile(asset, i)));
    update((prev) => [...prev, ...added]);
    queue.enqueue(added.map((item) => ({ clientId: item.id, file: item.file as LocalImageFile })));
  };

  /** Hata alan kalemi yeniden kuyruğa al (diğer kalemler etkilenmez). */
  const retryImage = (id: string) => {
    const target = imagesRef.current.find((item) => item.id === id);
    if (!target?.file || target.status !== 'failed') return;
    update((prev) => patchImage(prev, id, { status: 'queued', progress: 0, error: undefined }));
    queue.enqueue([{ clientId: id, file: target.file }]);
  };

  /** Kalemi KİMLİĞİNDEN kaldır (indeks, sıralama/çevirme sırasında kayar); süren isteği de durdur. */
  const removeImage = (id: string) => {
    queue.cancel(id);
    rotatingIdsRef.current.delete(id);
    update((prev) => removeImageById(prev, id));
  };

  /**
   * Sıralama KİMLİKLE: konum işlem anındaki listeden çözülür (sürükleme/menü açıkken liste
   * değişmiş olabilir). Sürükle-bırak: `to` = bırakılan yuva.
   */
  const moveImage = (id: string, to: number) => update((prev) => moveImageById(prev, id, to));

  /** Menü "Sola/Sağa taşı": `delta` = -1 / +1. */
  const shiftImage = (id: string, delta: number) => update((prev) => shiftImageById(prev, id, delta));

  /** Kapak = ilk kalem (web `makeCover`). */
  const makeCoverImage = (id: string) => update((prev) => makeCoverById(prev, id));

  /**
   * 90° çevir — sunucu depodaki detay türevini çevirip YENİ anahtarlar döner
   * (`POST /media/product-image/rotate`; taze yüklenen geçici görsellerde de çalışır).
   * Eski anahtarlar silinmez (sunucu temizler), bu yüzden hata durumunda kalem aynen kalır.
   */
  const rotateImage = async (id: string) => {
    const target = imagesRef.current.find((item) => item.id === id);
    if (!target || target.status !== 'ready' || !target.detailKey || rotatingIdsRef.current.has(id)) return;
    rotatingIdsRef.current.add(id);
    update((prev) => patchImage(prev, id, { status: 'rotating' }));
    try {
      const { data } = await mediaApi.rotateProductImage(target.detailKey);
      // Kalem bu arada kaldırıldıysa `patchImage` hiçbir şey yapmaz.
      update((prev) =>
        patchImage(prev, id, {
          cardKey: data.cardKey,
          detailKey: data.detailKey,
          uri: rotatedPreviewUri(data.cardUrl || data.detailUrl, target.uri),
          status: 'ready',
        }),
      );
    } catch {
      update((prev) => patchImage(prev, id, { status: 'ready' }));
      toast.error(t('product.imageUpload.rotateFailed'));
    } finally {
      rotatingIdsRef.current.delete(id);
    }
  };

  const blocker = imageSubmitBlocker(images);
  /** Gönderim engeli + kullanıcıya gösterilecek metin (yoksa `null`). */
  const submitBlocker = blocker
    ? {
        reason: blocker,
        message:
          blocker === 'pending'
            ? t('product.imageUpload.blockerPending')
            : t('product.imageUpload.blockerFailed'),
      }
    : null;

  return {
    images,
    imageKeys,
    maxImages,
    /** Kuyrukta/aktarımda kalem var — kaydet düğmesi kilitli. */
    uploadingImages: hasPendingUploads(images),
    submitBlocker,
    /** Güncel liste (gönderim anı kontrolleri için; render'ı beklemez). */
    imagesRef,
    replaceImages,
    pickImages,
    retryImage,
    removeImage,
    moveImage,
    shiftImage,
    makeCoverImage,
    rotateImage,
    imageDragActive,
    setImageDragActive,
  };
}

export type ListingImageUploadController = ReturnType<typeof useListingImageUpload>;
