/**
 * Dosya bazlı yükleme kuyruğu (web `listing-upload-queue.ts` karşılığı).
 *
 * Seçilen bütün görseller TEK multipart istekle gidiyordu: sunucu hepsini
 * işleyene kadar önizleme yoktu, tek dosyanın hatası ya da global 30 sn
 * timeout bütün partiyi düşürüyordu. Artık her dosya kendi isteğidir
 * (en fazla `UPLOAD_CONCURRENCY` paralel); biri düşerse diğerleri tamamlanır.
 *
 * React'ten bağımsızdır: `upload` portu dışarıdan verilir, bu yüzden kısmi
 * hata, iptal, eşzamanlılık sınırı ve ilerleme davranışı doğrudan test edilir.
 */
import type { LocalImageFile } from './prepareImage';

export const UPLOAD_CONCURRENCY = 3;
/** İlerleme bu adımlarla yayılır — her bayt olayında state güncellemesi yapılmasın. */
const PROGRESS_STEP = 5;

/** Kuyruğun yaydığı durumlar (`ListingImageStatus`'un yükleme alt kümesi; `ready` = yüklendi). */
export type UploadStatus = 'queued' | 'uploading' | 'processing' | 'ready' | 'failed';

export interface UploadResult {
  cardKey: string;
  detailKey: string;
  /** Sunucunun döndürdüğü önizleme URL'si (kart → detay). */
  url?: string;
}

/** Tek dosyayı yükleyen port — iptal ve ilerleme desteklemek zorundadır. */
export type UploadPort = (
  file: LocalImageFile,
  options: { signal: AbortSignal; onProgress: (percent: number) => void },
) => Promise<UploadResult>;

export interface QueueItem {
  clientId: string;
  file: LocalImageFile;
}

export interface QueueEvent {
  clientId: string;
  status: UploadStatus;
  progress?: number;
  result?: UploadResult;
  error?: unknown;
}

export interface UploadQueue {
  /** Kuyruğa ekle; boş slot varsa hemen başlar. */
  enqueue(items: QueueItem[]): void;
  /** Tek kalemi iptal et (aktifse isteği de durdurur). */
  cancel(clientId: string): void;
  /** Tümünü iptal et — unmount'ta / liste yeniden kurulurken çağrılır. */
  cancelAll(): void;
  /** Test/teşhis: o an aktif istek sayısı. */
  activeCount(): number;
}

export const isAbortError = (error: unknown): boolean =>
  (error as { name?: string } | null)?.name === 'AbortError' ||
  (error as { name?: string } | null)?.name === 'CanceledError' ||
  (error as { code?: string } | null)?.code === 'ERR_CANCELED';

/** İptal hatası (RN'de `DOMException` yok). */
export function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

export function createUploadQueue(options: {
  upload: UploadPort;
  onEvent: (event: QueueEvent) => void;
  concurrency?: number;
}): UploadQueue {
  const concurrency = options.concurrency ?? UPLOAD_CONCURRENCY;
  const pending: QueueItem[] = [];
  const controllers = new Map<string, AbortController>();
  /** İptal edilenler: geç gelen sonuç/hata olayları bastırılır. */
  const cancelled = new Set<string>();
  let active = 0;

  const emit = (event: QueueEvent) => {
    if (cancelled.has(event.clientId)) return;
    options.onEvent(event);
  };

  const pump = () => {
    while (active < concurrency && pending.length > 0) {
      const item = pending.shift() as QueueItem;
      if (cancelled.has(item.clientId)) continue;
      void run(item);
    }
  };

  const run = async (item: QueueItem) => {
    active += 1;
    const controller = new AbortController();
    controllers.set(item.clientId, controller);
    let lastProgress = 0;
    emit({ clientId: item.clientId, status: 'uploading', progress: 0 });

    try {
      const result = await options.upload(item.file, {
        signal: controller.signal,
        onProgress: (percent) => {
          // Baytlar bitti ama yanıt beklenirken "işleniyor": sunucuda moderasyon,
          // sharp dönüşümü ve depolama yüklemesi sürüyor — %100'ü "hazır"
          // göstermek sahte bir ilerleme olurdu.
          if (percent >= 100) {
            if (lastProgress === 100) return;
            lastProgress = 100;
            emit({ clientId: item.clientId, status: 'processing', progress: 100 });
            return;
          }
          const stepped = Math.max(0, Math.min(99, Math.floor(percent / PROGRESS_STEP) * PROGRESS_STEP));
          if (stepped === lastProgress) return;
          lastProgress = stepped;
          emit({ clientId: item.clientId, status: 'uploading', progress: stepped });
        },
      });
      if (controller.signal.aborted) return;
      emit({ clientId: item.clientId, status: 'ready', progress: 100, result });
    } catch (error) {
      // İptal bir hata değildir: kalem zaten listeden kaldırılıyor.
      if (!isAbortError(error) && !controller.signal.aborted) {
        emit({ clientId: item.clientId, status: 'failed', error });
      }
    } finally {
      if (controllers.get(item.clientId) === controller) controllers.delete(item.clientId);
      active -= 1;
      // Bir dosyanın hatası kuyruğu durdurmaz.
      pump();
    }
  };

  return {
    enqueue(items) {
      for (const item of items) {
        cancelled.delete(item.clientId);
        pending.push(item);
        emit({ clientId: item.clientId, status: 'queued', progress: 0 });
      }
      pump();
    },
    cancel(clientId) {
      cancelled.add(clientId);
      controllers.get(clientId)?.abort();
      const queuedIndex = pending.findIndex((item) => item.clientId === clientId);
      if (queuedIndex >= 0) pending.splice(queuedIndex, 1);
    },
    cancelAll() {
      for (const item of pending) cancelled.add(item.clientId);
      pending.length = 0;
      for (const [clientId, controller] of controllers) {
        cancelled.add(clientId);
        controller.abort();
      }
    },
    activeCount: () => active,
  };
}
