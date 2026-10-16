/**
 * İşleri SIRAYLA çalıştıran kapı. Yüklemeler paralel gidebilir ama tam çözünürlüklü
 * çözme (48 MP ≈ 190 MB bitmap) aynı anda birkaç kez yapılırsa eski Android
 * cihazlarda bellek yetmez — görsel hazırlama tek tek yapılır. Bir işin hatası
 * sırayı durdurmaz.
 */
export function createSerialRunner() {
  let tail: Promise<unknown> = Promise.resolve();
  return function run<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(task, task);
    tail = result.catch(() => undefined);
    return result;
  };
}
