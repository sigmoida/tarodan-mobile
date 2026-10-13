import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Keyboard, type LayoutChangeEvent } from 'react-native';
import type { FlashListRef } from '@shopify/flash-list';
import {
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatPriceRange } from '@/utils/format';

import { productsApi, searchApi } from '@/lib/api';
import { useRecentSearchesStore } from '@/stores/recentSearchesStore';
import { useProductFilterOptions } from '@/hooks/useProductFilterOptions';
import {
  EMPTY_FILTERS,
  buildListParams,
  countActiveFilters,
  extractListings,
  extractMeta,
  keepGeneralAttributeSelections,
  type ProductFilters,
} from '@/utils/productFilters';
import { PAGE_SIZE, conditionLabel } from '../_lib/searchConstants';
import {
  BARS_ANIM_MS,
  nextBarsHidden,
  shouldShowScrollTop,
} from '../_lib/barsCollapse';

// Kararlı boş dizi: `sellerAutoRes.data ?? []` her render'da yeni referans üretiyordu.
const EMPTY_SELLERS: any[] = [];

/**
 * Search screen controller — owns filter state, the debounced search box, the
 * nav-token param sync, autocomplete + seller-autocomplete queries, the infinite
 * product query, collapsible-bars animation, scroll behaviors, and modal state.
 * Lifted verbatim from the monolithic SearchScreen.
 */
export function useSearch() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  // Filtre state'i (web listings/page.tsx ile aynı shape)
  const [filters, setFilters] = useState<ProductFilters>(() => ({
    ...EMPTY_FILTERS,
    search: (params.q as string) || '',
    category: (params.category as string) || '',
    categoryId: (params.categoryId as string) || '',
    brand: (params.brand as string) || '',
    brandId: (params.brandId as string) || '',
    scale: (params.scale as string) || '',
    manufacturer: (params.manufacturer as string) || '',
    manufacturerId: (params.manufacturerId as string) || '',
  }));

  // Arama kutusunun metni artık BU hook'ta değil: `SearchInputBox` kendi state'ini tutar ve
  // 400ms debounce sonrası `commitQuery` ile onaylanmış sorguyu yazar → her tuşta ekran render olmaz.
  // Dışarıdan (öneri/son arama seçimi, temizle) kutuyu yazdırmak için `inputCommand` kullanılır.
  const initialQuery = useRef(filters.search).current;
  const [inputEmpty, setInputEmpty] = useState(!filters.search);
  const [inputCommand, setInputCommand] = useState<{ text: string; nonce: number } | null>(null);
  const setInputText = useCallback((text: string) => {
    setInputCommand((c) => ({ text, nonce: (c?.nonce ?? 0) + 1 }));
  }, []);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  // Izgara / liste görünümü (web ProductLayoutSelector) — araç çubuğu anahtarı.
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  // Arama artık yığın ekranı: her `router.push('/search?…')` taze bir ekran kurar, bu yüzden
  // filtreler yukarıda URL parametrelerinden bir kez başlatılır (eski `navToken` tekrar-uygulama
  // hilesi gerekmez). `focus=1` (üst bardaki arama alanından gelince) kutuya otomatik odaklanır.
  const autoFocusSearch = params.focus === '1';
  useEffect(() => {
    if (params.openFilter) setFilterModalVisible(true);
    // yalnız ilk açılışta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seçili üreticinin slug'ını çöz ki üreticiye-özel filtreler (HW vb.) yüklensin.
  const baseOptions = useProductFilterOptions();
  const manufacturerSlug = useMemo(() => {
    const list = baseOptions.manufacturers;
    if (filters.manufacturerId) return list.find((m) => m.id === filters.manufacturerId)?.slug;
    if (filters.manufacturer)
      return list.find((m) => m.name.toLowerCase() === filters.manufacturer.toLowerCase())?.slug;
    return undefined;
  }, [filters.manufacturerId, filters.manufacturer, baseOptions.manufacturers]);
  const options = useProductFilterOptions(manufacturerSlug);

  const searches = useRecentSearchesStore((st) => st.searches);
  const addSearch = useRecentSearchesStore((st) => st.addSearch);
  const removeSearch = useRecentSearchesStore((st) => st.removeSearch);
  const clearSearches = useRecentSearchesStore((st) => st.clearSearches);
  const recentSearchQueries = useMemo(() => searches.map((s) => s.query), [searches]);

  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [showRecentSearches, setShowRecentSearches] = useState(false);

  // Sonuç listesi aşağı kaydırılınca üst çubukları (arama + filtre) gizle, yukarı kaydırınca geri getir.
  // Karar ve animasyon UI thread'inde (Reanimated scroll handler + shared value); JS'e yalnız
  // eşik geçişleri (en üste dön düğmesi, öneri panelini kapatma) döner.
  // Liste yeterince aşağı inince "en üste dön" butonunu göster.
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<FlashListRef<any>>(null);

  // Üst çubukları absolute bir katmanda tutup translateY ile kaydırıyoruz (liste reflow olmaz → takılmaz).
  // Yükseklik TAHMİN EDİLMEZ: 0'dan başlar ve ilk `onLayout` ölçümüyle yazılır. Ölçüm
  // gelene kadar `barsMeasured` false'tur ve ekran listeyi gizli tutar; böylece liste
  // yanlış bir üst boşlukla bir kare çizilip sonra yerine kaymaz.
  const [headerHeight, setHeaderHeight] = useState(0);
  const barsMeasured = headerHeight > 0;
  const barsTranslateY = useSharedValue(0);
  const barsHidden = useSharedValue(false);
  const headerHeightSV = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const scrollTopVisible = useSharedValue(false);
  const panelsOpenSV = useSharedValue(false);
  useEffect(() => {
    headerHeightSV.value = headerHeight;
    // Çubuklar gizliyken yükseklik değişirse (çip eklendi/çıktı) yeni yüksekliğe göre hizala.
    if (barsHidden.value) {
      barsTranslateY.value = withTiming(-headerHeight, { duration: BARS_ANIM_MS });
    }
  }, [headerHeight, headerHeightSV, barsHidden, barsTranslateY]);
  const onBarsLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h <= 0) return;
    setHeaderHeight((prev) => (Math.abs(h - prev) > 0.5 ? h : prev));
  }, []);

  // Arama kutusu (debounce sonrası) → filters.search + öneri sorgusu
  const commitQuery = useCallback(
    (text: string) => {
      setFilters((prev) => (prev.search === text ? prev : { ...prev, search: text.trim() }));
      const q = text.trim();
      setAutocompleteQuery(q.length >= 2 ? q : '');
    },
    [],
  );

  // Son aramalara YALNIZ onaylanmış aramada yazılır (Enter / öneri seçimi / öneriden sonuca gitme /
  // dışarıdan gelen `q` ile açılış). Eskiden her debounce'ta ("fer","ferr","ferra") kaydoluyor ve
  // AsyncStorage'a persist yazıyordu.
  const saveRecentSearch = useCallback(
    (text: string) => {
      const q = text.trim();
      if (q.length >= 2) addSearch(q);
    },
    [addSearch],
  );
  useEffect(() => {
    saveRecentSearch(initialQuery);
    // yalnız ilk açılışta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autocompleteQueryRes = useQuery({
    queryKey: ['autocomplete-rich', autocompleteQuery],
    queryFn: async () => {
      if (!autocompleteQuery) return null;
      try {
        const response = await searchApi.autocompleteRich(autocompleteQuery);
        return response.data;
      } catch {
        return null;
      }
    },
    // Yalnız öneri paneli açıkken (kutu odakta) çalışır; kapalıyken sessiz kalır.
    enabled: !!autocompleteQuery && autocompleteOpen,
  });
  const autocomplete = autocompleteQueryRes.data;

  // İsimle satıcı arama — autocomplete'te "Satıcılar" bölümü
  const sellerAutoRes = useQuery({
    queryKey: ['autocomplete-sellers', autocompleteQuery],
    queryFn: async () => {
      if (!autocompleteQuery) return [];
      try {
        const response = await searchApi.users(autocompleteQuery, 6);
        return response.data ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!autocompleteQuery && autocompleteOpen,
  });
  const sellerResults = sellerAutoRes.data ?? EMPTY_SELLERS;

  // --- Ürün listesi: web /products endpoint'i + sayfalama (sonsuz kaydırma) ---
  const queryClient = useQueryClient();
  const searchKey = ['products-search', filters] as const;
  const {
    data,
    isLoading,
    isError,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: searchKey,
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const listParams = buildListParams(filters, pageParam as number, PAGE_SIZE);
      const res = await productsApi.getAll(listParams);
      return {
        items: extractListings(res.data),
        meta: extractMeta(res.data, pageParam as number, PAGE_SIZE),
      };
    },
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    // NOT: `maxPages` bilerek YOK. 6. sayfada react-query ilk sayfayı atınca dizi 24 öğe kayıyor,
    // liste sıçrıyordu; kart başına yük hafif olduğundan tüm sayfaları tutmak bellek sorunu değil.
    getPreviousPageParam: (first) =>
      first.meta.page > 1 ? first.meta.page - 1 : undefined,
  });

  // Sayfalar arası tekilleştirme: sayfalama sırasında bir ilan iki sayfada da dönebilir
  // (araya yeni ilan girerse kayma olur); `keyExtractor` yalnız `item.id` kullandığı için
  // yinelenen id'ler listeden elenir.
  // Pull-to-refresh: spinner YALNIZ kullanıcı çekip bıraktığında döner (`isRefetching` sonraki sayfa
  // yüklemesinde / filtre değişiminde de true olur → RefreshControl yanlışlıkla tetiklenirdi).
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const refreshFirstPage = useCallback(async () => {
    setPullRefreshing(true);
    try {
      // `refetch()` yüklü TÜM sayfaları sırayla çeker; önce önbelleği ilk sayfaya kırp, sonra
      // yenile → tek istek (TanStack v5 önerisi). Liste en üstte olduğundan görsel kayıp yok.
      queryClient.setQueryData<InfiniteData<unknown>>(searchKey, (old) =>
        old && old.pages.length > 1
          ? { pages: old.pages.slice(0, 1), pageParams: old.pageParams.slice(0, 1) }
          : old,
      );
      await refetch();
    } finally {
      setPullRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, refetch, filters]);

  const products: any[] = useMemo(() => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const page of data?.pages ?? []) {
      for (const item of page.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(item);
      }
    }
    return out;
  }, [data]);
  const total = data?.pages[0]?.meta.total ?? 0;

  const activeFiltersCount = useMemo(() => countActiveFilters(filters), [filters]);

  const handleRecentSearchSelect = useCallback(
    (query: string) => {
      setInputText(query);
      setShowRecentSearches(false);
      setAutocompleteOpen(false);
    },
    [setInputText],
  );

  const clearAllFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS });
    setInputText('');
  }, [setInputText]);

  // Öneriden metin seçilince: kutuyu doldur, öneri panelini kapat.
  const pickSuggestion = useCallback(
    (text: string) => {
      setInputText(text);
      setAutocompleteOpen(false);
      saveRecentSearch(text);
    },
    [setInputText, saveRecentSearch],
  );
  // Öneriden ürün/satıcı sayfasına gidilince, o an yazılan sorgu onaylanmış sayılır.
  const confirmQuery = useCallback(() => saveRecentSearch(autocompleteQuery), [saveRecentSearch, autocompleteQuery]);
  const closeAutocomplete = useCallback(() => setAutocompleteOpen(false), []);
  // Kutu odağı: panelleri aç; odak kaybında tıklamaya yer bırakmak için 200ms gecikmeyle kapat.
  const onInputFocus = useCallback(() => {
    setShowRecentSearches(true);
    setAutocompleteOpen(true);
  }, []);
  const onInputBlur = useCallback(() => {
    setTimeout(() => {
      setShowRecentSearches(false);
      setAutocompleteOpen(false);
    }, 200);
  }, []);

  // Aktif filtre çipleri (web parity: kaldırılabilir)
  const activeChips = useMemo(() => {
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (filters.category) activeChips.push({ key: 'cat', label: filters.category, onRemove: () => setFilters({ ...filters, category: '', categoryId: '' }) });
  if (filters.brand) activeChips.push({ key: 'brand', label: filters.brand, onRemove: () => setFilters({ ...filters, brand: '', brandId: '', carModel: '', carModelId: '' }) });
  if (filters.carModel) activeChips.push({ key: 'model', label: filters.carModel, onRemove: () => setFilters({ ...filters, carModel: '', carModelId: '' }) });
  if (filters.manufacturer) activeChips.push({ key: 'manuf', label: filters.manufacturer, onRemove: () => setFilters({
    ...filters,
    manufacturer: '',
    manufacturerId: '',
    // Üreticiye bağlı grup seçimleri düşer, genel gruplar kalır (filtre sayfasıyla aynı kural).
    customAttributes: keepGeneralAttributeSelections(filters.customAttributes, options.customAttributes),
  }) });
  if (filters.scale) activeChips.push({ key: 'scale', label: filters.scale, onRemove: () => setFilters({ ...filters, scale: '' }) });
  if (filters.material) activeChips.push({ key: 'mat', label: filters.material, onRemove: () => setFilters({ ...filters, material: '' }) });
  if (filters.condition) activeChips.push({ key: 'cond', label: conditionLabel(filters.condition, t), onRemove: () => setFilters({ ...filters, condition: '' }) });
  if (filters.minPrice || filters.maxPrice) activeChips.push({ key: 'price', label: formatPriceRange(filters.minPrice, filters.maxPrice), onRemove: () => setFilters({ ...filters, minPrice: '', maxPrice: '' }) });
  if (filters.tradeOnly) activeChips.push({ key: 'trade', label: t('filter.tradeOnlyChip'), onRemove: () => setFilters({ ...filters, tradeOnly: false }) });
  if (filters.discountOnly) activeChips.push({ key: 'disc', label: t('filter.discountOnlyLabel'), onRemove: () => setFilters({ ...filters, discountOnly: false }) });
  if (filters.preOrder) activeChips.push({ key: 'pre', label: t('product.preOrder'), onRemove: () => setFilters({ ...filters, preOrder: false }) });
  if (filters.limited) activeChips.push({ key: 'lim', label: t('product.limitedEdition'), onRemove: () => setFilters({ ...filters, limited: false }) });
  if (filters.set) activeChips.push({ key: 'set', label: t('product.setBundle'), onRemove: () => setFilters({ ...filters, set: false }) });
  return activeChips;
  }, [filters, options.customAttributes, t]);

  // Öneri/geçmiş paneli görünür mü? (X kapat tuşu ve input köşe stilinde kullanılır)
  const recentPanelOpen =
    showRecentSearches && recentSearchQueries.length > 0 && inputEmpty;
  const autocompletePanelOpen =
    autocompleteOpen && autocompleteQuery.length >= 2 && !!autocomplete;
  const suggestionsOpen = recentPanelOpen || autocompletePanelOpen;

  const closeSuggestions = useCallback(() => {
    Keyboard.dismiss();
    setShowRecentSearches(false);
    setAutocompleteOpen(false);
  }, []);

  // Öneriden bir facet (marka/üretici/kategori) seçilince: paneli kapat ve arama metnini temizle
  // (yoksa arama + facet birlikte 2 filtre gibi sayılır).
  const applyFacet = useCallback(
    (partial: Partial<ProductFilters>) => {
      setInputText('');
      closeSuggestions();
      setFilters((prev) => ({ ...prev, search: '', ...partial }));
    },
    [setInputText, closeSuggestions],
  );

  // Paneller açık mı? UI thread'indeki scroll handler JS state'ini okuyamaz → shared value'ya yansıt.
  const panelsOpen = showRecentSearches || autocompleteOpen;
  useEffect(() => {
    panelsOpenSV.value = panelsOpen;
  }, [panelsOpen, panelsOpenSV]);

  // UI thread'inde çalışır (worklet): her karede JS'e düşmez.
  const handleResultsScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      // Sonuçları kaydırınca öneri/geçmiş panelini ve klavyeyi tamamen kapat (JS'e tek sefer).
      if (panelsOpenSV.value) {
        panelsOpenSV.value = false;
        scheduleOnRN(closeSuggestions);
      }
      const hidden = nextBarsHidden(
        y,
        lastScrollY.value,
        barsHidden.value,
        headerHeightSV.value > 0,
        headerHeightSV.value,
      );
      if (hidden !== barsHidden.value) {
        barsHidden.value = hidden;
        barsTranslateY.value = withTiming(hidden ? -headerHeightSV.value : 0, {
          duration: BARS_ANIM_MS,
        });
      }
      const showTop = shouldShowScrollTop(y);
      if (showTop !== scrollTopVisible.value) {
        scrollTopVisible.value = showTop;
        scheduleOnRN(setShowScrollTop, showTop);
      }
      lastScrollY.value = y;
    },
  });

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return {
    // filters / search box
    filters,
    setFilters,
    initialQuery,
    inputEmpty,
    setInputEmpty,
    inputCommand,
    setInputText,
    commitQuery,
    autoFocusSearch,
    clearAllFilters,
    activeChips,
    activeFiltersCount,
    // options for the filter sheet
    options,
    // recent searches
    recentSearchQueries,
    clearSearches,
    removeSearch,
    handleRecentSearchSelect,
    pickSuggestion,
    confirmQuery,
    saveRecentSearch,
    closeAutocomplete,
    onInputFocus,
    onInputBlur,
    // suggestions / autocomplete
    autocompleteOpen,
    setAutocompleteOpen,
    autocompleteQuery,
    autocomplete,
    sellerResults,
    showRecentSearches,
    setShowRecentSearches,
    suggestionsOpen,
    closeSuggestions,
    applyFacet,
    // list query
    products,
    total,
    isLoading,
    isError,
    isFetching,
    refetch,
    refreshing: pullRefreshing,
    refreshFirstPage,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    // collapsible bars + scroll
    listRef,
    headerHeight,
    barsMeasured,
    barsHidden,
    barsTranslateY,
    onBarsLayout,
    handleResultsScroll,
    showScrollTop,
    scrollToTop,
    layout,
    setLayout,
    // modals
    filterModalVisible,
    setFilterModalVisible,
    sortModalVisible,
    setSortModalVisible,
  };
}

export type SearchController = ReturnType<typeof useSearch>;
