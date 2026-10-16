import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useLatestRef } from './useLatestRef';

/**
 * Formunu store kullanıcısından TOHUMLAYAN ekranlar için tam profil kapısı.
 *
 * Neden: soğuk açılışta `user` saklı görüntüden gelir (`@/stores/userSnapshot` — telefon,
 * doğum tarihi, bio, vergi dairesi, sosyal alanlar BİLİNÇLİ olarak yok), giriş yanıtı da bu
 * alanları taşımaz. Profil düzenleme / telefon doğrulama formu bu `user`'la açılırsa alanlar
 * boş görünür ve kayıt yanlış bir temelle (ör. "telefon değişti") gider. Çevrimdışı / yavaş
 * açılışta arka plan doğrulaması henüz dönmemiş olabilir.
 *
 * Bu oturumda tam profil (`profileValidated`) yoksa `refreshUserData()` (GET /users/me) bir kez
 * çekilir; veri store'a yazılır (bu sorgu yalnız tetikleyicidir). Ekran `ready` olana kadar
 * yükleniyor, hata olursa `error` + `retry` gösterir; `ready` false→true geçişinde form
 * temelini bir kez yeniden kurar (`useOnProfileReady`).
 *
 * `enabled: false` → kapı yok (`ready` hemen true; ör. numara parametreyle geldi).
 */
export function useFullProfile({ enabled = true }: { enabled?: boolean } = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const profileValidated = useAuthStore((s) => s.profileValidated);
  const userId = useAuthStore((s) => s.user?.id);
  const refreshUserData = useAuthStore((s) => s.refreshUserData);

  const needed = enabled && isAuthenticated && !profileValidated;
  const query = useQuery({
    queryKey: qk.user.fullProfile(userId),
    queryFn: async () => {
      const fresh = await refreshUserData();
      // `refreshUserData` hatayı yutar (null) — kapının hata/tekrar dene hâli için fırlat.
      if (!fresh) throw new Error('Full profile unavailable');
      return fresh.id;
    },
    enabled: needed && !!userId,
    // Veri store'da; önbellek yalnız tetikleyici. Yeniden gerekince (yeni oturum) hep çekilsin.
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  return {
    ready: !needed,
    error: needed && query.isError ? query.error : null,
    retry: () => {
      void query.refetch();
    },
  };
}

/**
 * `ready` false→true geçişinde (tam profil geldi) `onReady`'yi bir kez çalıştırır — RHF
 * `reset` ile form temelini taze kullanıcıdan kurmak için. Açılışta zaten `ready` ise
 * çağrılmaz (varsayılanlar zaten tam profilden).
 */
export function useOnProfileReady(ready: boolean, onReady: () => void): void {
  const prev = useRef(ready);
  const onReadyRef = useLatestRef(onReady);
  useEffect(() => {
    const wasReady = prev.current;
    prev.current = ready;
    if (ready && !wasReady) onReadyRef.current();
  }, [ready, onReadyRef]);
}
