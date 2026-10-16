import { createUploadQueue, isAbortError, type QueueEvent, type UploadPort } from '../uploadQueue';
import type { LocalImageFile } from '../prepareImage';

const file = (n: number): LocalImageFile => ({ uri: `file:///${n}.jpg`, name: `${n}.jpg`, type: 'image/jpeg' });

type Deferred = {
  file: LocalImageFile;
  signal: AbortSignal;
  onProgress: (p: number) => void;
  resolve: (v: { cardKey: string; detailKey: string; url?: string }) => void;
  reject: (e: unknown) => void;
};

/** Elle çözülen port: her çağrı bir `Deferred` bırakır. */
function manualPort() {
  const calls: Deferred[] = [];
  const upload: UploadPort = (f, { signal, onProgress }) =>
    new Promise((resolve, reject) => {
      calls.push({ file: f, signal, onProgress, resolve, reject });
      signal.addEventListener('abort', () => {
        const e = new Error('canceled');
        e.name = 'CanceledError';
        reject(e);
      });
    });
  return { upload, calls };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(concurrency?: number) {
  const port = manualPort();
  const events: QueueEvent[] = [];
  const queue = createUploadQueue({ upload: port.upload, onEvent: (e) => events.push(e), concurrency });
  const statusOf = (id: string) => events.filter((e) => e.clientId === id).map((e) => e.status);
  return { ...port, events, queue, statusOf };
}

describe('yükleme kuyruğu', () => {
  it('eşzamanlılık 3: dördüncü dosya biri bitene kadar sırada bekler', async () => {
    const { queue, calls, statusOf } = setup();
    queue.enqueue([1, 2, 3, 4].map((n) => ({ clientId: `c${n}`, file: file(n) })));
    expect(calls).toHaveLength(3);
    expect(queue.activeCount()).toBe(3);
    expect(statusOf('c4')).toEqual(['queued']);

    calls[0]!.resolve({ cardKey: 'k1', detailKey: 'd1', url: 'https://x/1.webp' });
    await flush();
    expect(calls).toHaveLength(4);
    expect(calls[3]!.file.uri).toBe('file:///4.jpg');
    expect(statusOf('c1')).toEqual(['queued', 'uploading', 'ready']);
  });

  it('ilerleme: adımlı yüzde, %100 → "processing", sonuçla "ready"', async () => {
    const { queue, calls, events } = setup();
    queue.enqueue([{ clientId: 'a', file: file(1) }]);
    calls[0]!.onProgress(12);
    calls[0]!.onProgress(13); // aynı adım (10) — olay yok
    calls[0]!.onProgress(57.9);
    calls[0]!.onProgress(100);
    calls[0]!.onProgress(100); // tekrar — olay yok
    calls[0]!.resolve({ cardKey: 'k', detailKey: 'd' });
    await flush();
    expect(events.map((e) => [e.status, e.progress])).toEqual([
      ['queued', 0],
      ['uploading', 0],
      ['uploading', 10],
      ['uploading', 55],
      ['processing', 100],
      ['ready', 100],
    ]);
    expect(events.at(-1)!.result).toEqual({ cardKey: 'k', detailKey: 'd' });
  });

  it('hatalı dosya diğerlerini etkilemez; hata olayı hatayı taşır', async () => {
    const { queue, calls, statusOf, events } = setup();
    queue.enqueue([1, 2].map((n) => ({ clientId: `c${n}`, file: file(n) })));
    const err = { response: { data: { message: 'Dosya çok büyük' } } };
    calls[0]!.reject(err);
    calls[1]!.resolve({ cardKey: 'k2', detailKey: 'd2' });
    await flush();
    expect(statusOf('c1')).toEqual(['queued', 'uploading', 'failed']);
    expect(statusOf('c2')).toEqual(['queued', 'uploading', 'ready']);
    expect(events.find((e) => e.status === 'failed')!.error).toBe(err);
    expect(queue.activeCount()).toBe(0);
  });

  it('cancel: aktif isteği durdurur, olay yaymaz; sıradaki kalem hiç başlamaz', async () => {
    const { queue, calls, statusOf } = setup(1);
    queue.enqueue([1, 2, 3].map((n) => ({ clientId: `c${n}`, file: file(n) })));
    queue.cancel('c2'); // sırada
    queue.cancel('c1'); // aktif
    expect(calls[0]!.signal.aborted).toBe(true);
    await flush();
    expect(statusOf('c1')).toEqual(['queued', 'uploading']);
    expect(statusOf('c2')).toEqual(['queued']);
    // c1'in yeri boşalınca c2 atlanır, c3 başlar.
    expect(calls).toHaveLength(2);
    expect(calls[1]!.file.uri).toBe('file:///3.jpg');
  });

  it('cancelAll (unmount): uçuştaki tüm istekler iptal, geç sonuçlar bastırılır', async () => {
    const { queue, calls, events } = setup();
    queue.enqueue([1, 2, 3, 4].map((n) => ({ clientId: `c${n}`, file: file(n) })));
    const before = events.length;
    queue.cancelAll();
    expect(calls.every((c) => c.signal.aborted)).toBe(true);
    await flush();
    expect(events).toHaveLength(before);
    expect(calls).toHaveLength(3);
  });

  it('yeniden kuyruğa alma (retry) aynı kimlikle tekrar yükler', async () => {
    const { queue, calls, statusOf } = setup();
    queue.enqueue([{ clientId: 'a', file: file(1) }]);
    calls[0]!.reject(new Error('network'));
    await flush();
    queue.enqueue([{ clientId: 'a', file: file(1) }]);
    calls[1]!.resolve({ cardKey: 'k', detailKey: 'd' });
    await flush();
    expect(statusOf('a')).toEqual(['queued', 'uploading', 'failed', 'queued', 'uploading', 'ready']);
  });

  it('isAbortError: axios/fetch iptal biçimleri', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
    expect(isAbortError({ name: 'CanceledError' })).toBe(true);
    expect(isAbortError({ code: 'ERR_CANCELED' })).toBe(true);
    expect(isAbortError(new Error('x'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});
