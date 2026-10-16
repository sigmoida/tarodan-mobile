import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLockedNavigate } from '@/components/shell/useLockedPush';
import { buildGroups, type CategoryGroupKey, type CategoryTileData } from '../_lib/groups';
import { useCategoriesCatalog } from './useCategoriesCatalog';

/**
 * Kategoriler ekranının kontrolcüsü: veri → gruplar (`buildGroups`), seçili grup (ilk açılışta ilk
 * dolu grup), "Kategoriler" grubunda alt kategoriye iniş yolu (geri dönüşlü) ve kutu dokunuşu
 * (`/listings` itmesi — kilitli, çift dokunuş tek açılış).
 */
export function useCategoriesScreen() {
  const { t } = useTranslation();
  const catalog = useCategoriesCatalog();
  const go = useLockedNavigate();

  const groups = useMemo(
    () => buildGroups(t, { categories: catalog.categories, manufacturers: catalog.manufacturers, scales: catalog.scales }),
    [t, catalog.categories, catalog.manufacturers, catalog.scales],
  );

  const [selectedKey, setSelectedKey] = useState<CategoryGroupKey | null>(null);
  // Alt kategori inişi: kökten seçili düğüme kadar; boş = grubun kök kutuları.
  const [path, setPath] = useState<CategoryTileData[]>([]);

  // Seçili grup artık yoksa (veri değişti) ilk dolu gruba düşer.
  const group = groups.find((g) => g.key === selectedKey) ?? groups[0] ?? null;
  const current = group?.key === 'categories' ? (path[path.length - 1] ?? null) : null;

  const selectGroup = useCallback((key: CategoryGroupKey) => {
    setSelectedKey(key);
    setPath([]);
  }, []);

  const back = useCallback(() => setPath((p) => p.slice(0, -1)), []);

  const pressTile = useCallback(
    (tile: CategoryTileData) => {
      if (tile.children && tile.children.length > 0) setPath((p) => [...p, tile]);
      else if (tile.href) go(tile.href);
    },
    [go],
  );

  // Alt düzeyde başa "Tümü" kutusu: üst kategorinin kendi listesi (`allHref`; `children` olan
  // düğümde `href` yoktur, dokunuş alt düzeye iner).
  const tiles = useMemo<CategoryTileData[]>(() => {
    if (!group) return [];
    if (!current) return group.tiles;
    return [
      {
        id: `${current.id}:all`,
        label: t('common.all'),
        href: current.allHref,
        visual: 'plain',
      },
      ...(current.children ?? []),
    ];
  }, [group, current, t]);

  return {
    ...catalog,
    groups,
    group,
    /** Sağ alan başlığı: grup adı, ya da inilen kategorinin adı. */
    title: current?.label ?? group?.title ?? '',
    tiles,
    canGoBack: current != null,
    selectGroup,
    back,
    pressTile,
    /** Izgara altı bağlantısı (ör. "Tüm üreticiler") — kutularla aynı kilitli itme. */
    openHref: go,
  };
}
