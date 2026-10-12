import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { MessageKey } from "@/i18n/lib";
import { appAlert } from "@/ui";
import { productsApi, errorText } from "@/lib/api";
import { readRenewBatch, renewSummary, type RenewTexts } from "../_lib/renewal";
import { renewMessageKey } from "../_lib/activation";
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

  const renewOne = useMutation({
    mutationFn: (listingId: string) => productsApi.renew(listingId),
    onSuccess: (response) => {
      invalidate();
      appAlert(t("common.success"), t(renewMessageKey(response)));
    },
    onError: (err) => {
      appAlert(t("common.error"), errorText(err, t("profile.expiredListings.renewFailed")));
    },
  });

  const renewMany = useMutation({
    mutationFn: async (listings: Array<{ id: string; title: string }>) => {
      const response = await productsApi.renewMany(listings.map((l) => l.id));
      return {
        batch: readRenewBatch(response.data),
        titles: Object.fromEntries(listings.map((l) => [l.id, l.title])),
      };
    },
    onSuccess: ({ batch, titles }) => {
      invalidate();
      const { isError, message } = renewSummary(batch, (id) => titles[id] ?? id, texts);
      appAlert(t(isError ? "common.error" : "common.success"), message);
    },
    onError: (err) => {
      appAlert(t("common.error"), errorText(err, t("profile.expiredListings.renewFailed")));
    },
  });

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
