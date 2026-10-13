import { useLayoutEffect, useRef } from 'react';

/**
 * "useEvent" kalıbı: `await` sonrasında (kimlik kapısı gibi dakikalarca açık
 * kalabilen bir bekleme) BAYAT closure yerine en son COMMIT edilen render'ın
 * değerini/fonksiyonunu okumak için.
 *
 * Atama render sırasında DEĞİL, `useLayoutEffect`'te yapılır: render sırasında
 * ref yazmak saf olmayan render'dır (concurrent modda atılan bir render'ın
 * değeri sızabilir). Layout effect commit'ten hemen sonra, kullanıcı etkileşimi
 * gelmeden çalışır — olay işleyicileri her zaman güncel değeri görür.
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
