import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLockedNavigate } from '@/components/shell/useLockedPush';
import { buildGroups, type CategoryGroupKey, type CategoryTileData } from '../_lib/groups';
import { resolveTilePath } from '../_lib/path';
import { useCategoriesCatalog } from './useCategoriesCatalog';

/**
 * Kategoriler ekranının kontrolcüsü: veri → gruplar (`buildGroups`), seçili grup (ilk açılışta ilk
 * dolu grup), "Kategoriler" grubunda alt kategoriye iniş yolu (geri dönüşlü) ve kutu dokunuşu
 * (`/search?…` itmesi — kilitli, çift dokunuş tek açılış).
 */
export function useCategoriesScreen() {
  const { t } = useTranslation();
  const catalog = useCategoriesCatalog();
  const go = useLockedNavigate();
  const { categories, manufacturers, scales, status, retry } = catalog;

  const groups = useMemo(
    () => buildGroups(t, { categories, manufacturers, scales, status }),
    [t, categories, manufacturers, scales, status],
  );

  const [selectedKey, setSelectedKey] = useState<CategoryGroupKey | null>(null);
  // Alt kategori inişi: kökten seçili düğüme kadar kutu id'leri (nesne değil — katalog yenilenince
  // güncel ağaca göre yeniden çözülür); boş = grubun kök kutuları.
  const [pathIds, setPathIds] = useState<string[]>([]);

  // Seçili grup artık yoksa (veri değişti) ilk dolu gruba düşer.
  const group = groups.find((g) => g.key === selectedKey) ?? groups[0] ?? null;
  // Yalnız Kategoriler grubunda ve id'ler güncel ağaçta HEPSİ bulunuyorsa; aksi halde köke döner.
  const path = useMemo(
    () => (group?.key === 'categories' ? resolveTilePath(group.tiles, pathIds) : []),
    [group, pathIds],
  );
  const current = path[path.length - 1] ?? null;
  const parent = path[path.length - 2] ?? null;

  const selectGroup = useCallback((key: CategoryGroupKey) => {
    setSelectedKey(key);
    setPathIds([]);
  }, []);

  // Geri / iniş, state'teki (bayat olabilen) id'ler yerine ÇÖZÜLMÜŞ yoldan türetilir.
  const back = useCallback(() => setPathIds(path.slice(0, -1).map((p) => p.id)), [path]);

  const pressTile = useCallback(
    (tile: CategoryTileData) => {
      if (tile.children && tile.children.length > 0) setPathIds([...path.map((p) => p.id), tile.id]);
      else if (tile.href) go(tile.href);
    },
    [go, path],
  );

  const retryGroup = useCallback(() => {
    if (group && group.key !== 'explore') retry[group.key]();
  }, [group, retry]);

  // Alt düzeyde başa "Tümü" kutusu: üst kategorinin KENDİ listesi (`allHref`; `children` olan düğümde
  // `href` yoktur, dokunuş alt düzeye iner).
  const tiles = useMemo<CategoryTileData[]>(() => {
    if (!group) return [];
    if (!current) return group.tiles;
    return [
      { id: `${current.id}:all`, label: t('common.all'), href: current.allHref, visual: 'plain' },
      ...(current.children ?? []),
    ];
  }, [group, current, t]);

  return {
    groups,
    group,
    /** Sağ alan başlığı: grup adı, ya da inilen kategorinin adı. */
    title: current?.label ?? group?.title ?? '',
    tiles,
    canGoBack: current != null,
    /** Alt düzeyde geri düğmesinin gösterdiği üst başlık: üst kategori adı, yoksa grup adı. */
    parentTitle: parent?.label ?? group?.title ?? '',
    isLoading: catalog.isLoading,
    refreshing: catalog.refreshing,
    refetchAll: catalog.retryAll,
    /** Seçili grubun kendi kaynağını yeniden dener (hata durumundaki "tekrar dene"). */
    retryGroup,
    selectGroup,
    back,
    pressTile,
    /** Izgara altı bağlantısı (ör. "Tüm üreticiler") — kutularla aynı kilitli itme. */
    openHref: go,
  };
}
