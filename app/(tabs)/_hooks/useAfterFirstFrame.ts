import { useEffect, useState } from 'react';

/**
 * İlk kare ekrana çizildi mi? İki `requestAnimationFrame`: birincisi ilk commit'in karesinden önce,
 * ikincisi o kare çizildikten sonra çalışır. Ekranın alt kısmındaki ağır bölümleri (onlarca kart)
 * buna bağlayın: ilk açılış yalnız üstteki görünür bölümleri çizer, kalanı hemen ardından bağlanır
 * (o ana dek iskelet — yer kaplar, zıplama olmaz). Veri sorguları bundan bağımsız hemen başlar.
 */
export function useAfterFirstFrame(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let second: number | null = null;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(first);
      if (second !== null) cancelAnimationFrame(second);
    };
  }, []);
  return ready;
}
