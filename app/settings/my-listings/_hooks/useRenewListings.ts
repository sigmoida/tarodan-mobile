import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MessageKey } from "@/i18n/lib";
import { appAlert, toast } from "@/ui";
import { productsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api/errorText";
import { useAppMutation } from "@/lib/query";
import {
  readRenewBatch,
  renewMessageKey,
  renewSummary,
  UnexpectedRenewResponseError,
  type RenewTexts,
} from "../_lib/renewal";
import { useInvalidateMyListings } from "./useInvalidateMyListings";

/** Çeviri bağımlılıkları: `exists` yoksa (testte i18n mock'u) her anahtar var sayılır. */
function useRenewTexts(): RenewTexts {
  const { t, i18n } = useTranslation();
  return {
    t: (key: MessageKey, params) => (t as unknown as (k: string, p?: unknown) => string)(key, params),
    exists: (key) => i18n?.exists?.(key) ?? true,
  };
}

/**
 * Süresi dolan ilanın yenilenmesi — `POST /products/:id/renew` (tek) ve
 * `POST /products/my/renew` (toplu). İçeriği son onaydan beri değişmediyse
 * ilan doğrudan yayına döner, değiştiyse onaya düşer; kapılar (limit, stok,
 * satıcı durumu) sunucuda aynen çalışır. Eski `PATCH {relist:true}` yolu
 * whitelist'te atılıyor ve ilanı gereksiz `pending`e düşürüyordu.
 */
export function useRenewListings() {
  const { t } = useTranslation();
  const texts = useRenewTexts();
  const invalidate = useInvalidateMyListings();

  const renewOne = useAppMutation((listingId: string) => productsApi.renew(listingId), {
    success: (response) => t(renewMessageKey(response)),
    error: t("profile.expiredListings.renewFailed"),
    onSuccess: (_response, listingId) => invalidate(listingId),
  });

  const renewMany = useAppMutation(
    async (listings: Array<{ id: string; title: string }>) => {
      const response = await productsApi.renewMany(listings.map((l) => l.id));
      return {
        batch: readRenewBatch(response.data),
        titles: Object.fromEntries(listings.map((l) => [l.id, l.title])),
      };
    },
    {
      // Hata metni aşağıda: tanınmayan yanıt şekli (kodun kendi `Error`ı, İngilizce teknik metin)
      // kullanıcıya sızmasın diye yedek metin gösterilir.
      silentError: true,
      onSuccess: ({ batch, titles }) => {
        invalidate();
        const { message } = renewSummary(batch, (id) => titles[id] ?? id, texts);
        // Başarısız ilan varsa mesaj okunması gereken detay (başlıklar) taşır → diyalog
        // (başlık sonucu özetler); tam başarı yalnız bilgi → toast.
        if (batch.failed > 0) {
          appAlert(t("profile.expiredListings.bulkFailed", { count: batch.failed }), message);
        } else {
          toast.success(message);
        }
      },
      onError: (err) => {
        // Tanınmayan yanıt şeklinde (UnexpectedRenewResponseError) sunucu yenilemeyi
        // yapmış olabilir: sonucu bilmediğimiz için liste yine tazelenir.
        const fallback = t("profile.expiredListings.renewFailed");
        if (err instanceof UnexpectedRenewResponseError) {
          invalidate();
          toast.error(fallback);
        } else {
          toast.error(apiErrorMessage(err, fallback));
        }
      },
    },
  );

  return { renewOne, renewMany };
}

/** Toplu yenileme için işaretlenen süresi dolmuş ilanlar; listeden çıkan ilanın işareti düşer. */
export function useListingSelection(listings: Array<{ id: string }>) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const present = new Set(listings.map((l) => l.id));
    setSelected((current) => {
      const next = new Set([...current].filter((id) => present.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [listings]);

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);
  const toggleAll = useCallback(() => {
    setSelected((current) =>
      current.size === listings.length ? new Set() : new Set(listings.map((l) => l.id)),
    );
  }, [listings]);
  const clear = useCallback(() => setSelected(new Set()), []);

  return {
    selected,
    selectedCount: selected.size,
    allSelected: listings.length > 0 && selected.size === listings.length,
    toggle,
    toggleAll,
    clear,
  };
}
