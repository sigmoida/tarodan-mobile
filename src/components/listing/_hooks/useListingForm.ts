import { logger, safeError } from '@/services/logger';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { appAlert, toast } from '@/ui';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { useZodForm } from '@/ui/form';
import { buildListingFormSchema, emptyListingFormValues } from '../_lib/schema';
import { firstListingValidationError } from '../_lib/validate';
import { BANK_ACCOUNT_FROM_LISTING_HREF, listingGateView } from '../_lib/gates';
import { buildColorAndBoxPayload, serverErrorMessage } from '../_lib/payload';
import { MAX_COLORS } from '../_lib/schema';
import { globalCustomGroups, requiredGlobalGroups } from '../_lib/attributeGroups';
import { toFormValues } from '../_lib/editMapper';
import { imageSubmitBlocker, imagesFromMapped } from '../_lib/images';
import { useListingImageUpload } from './useListingImageUpload';
import { activatedStatus, activationMessageKey } from '../_lib/activation';
import { useDispatchAddress } from './useDispatchAddress';
import { invalidateListingCaches as invalidateListingCachesShared } from '../_lib/invalidate';
import { useDeleteListing } from './useDeleteListing';
import { useCommissionPreview } from './useCommissionPreview';
import {
  commissionPreviewAmount,
  defaultSaleDates,
  salePayload,
  saleStartsLater,
} from '../_lib/sale';
import { useRequireLegalIdentity } from '@/hooks/useLegalIdentity';
import { useLatestRef } from '@/hooks/useLatestRef';

import { useAuthStore } from '../../../stores/authStore';
import { api, productsApi, categoriesApi, bankAccountApi, shippingApi, type ListingRemovalPayload } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { qk } from '@/lib/query';
import { FALLBACK_SCALES, buildMaterials, BRAND_SLUGS, SCALE_SLUGS } from '../_lib/constants';
import type {
  Category,
  Brand,
  CarModel,
  Manufacturer,
  MaterialOption,
  ColorOption,
  ListingLimits,
  AttrGroup,
  ListingFormProps,
  MyProductResponse,
} from '../_lib/types';
import type { MappedListing } from '../_lib/editMapper';

/**
 * ListingForm controller — owns the entire create/edit form state machine.
 * Lifted verbatim from the monolithic component (RHF migration deferred): all
 * state, effects, API calls, image upload, submit/delete/reactivate handlers and
 * derived values live here so the screen only composes sections + modals.
 */
export function useListingForm({ mode, productId }: ListingFormProps) {
  const isEdit = mode === 'edit';
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { requireIdentity, isChecking: checkingIdentity } = useRequireLegalIdentity();

  const {
    isAuthenticated,
    isLoading: authLoading,
    user,
    limits,
    refreshUserData,
  } = useAuthStore();

  // IBAN kapısı (yalnız yeni ilan; web `BankGate`): hesap yoksa form GÖSTERİLMEZ.
  // Anahtar Banka Hesabım ekranıyla ORTAK (`qk.user.bankAccount`): orada kaydedilince
  // sorgu tazelenir ve kapı kendiliğinden açılır.
  const bankAccountQuery = useQuery({
    queryKey: qk.user.bankAccount,
    queryFn: async () => {
      const res = await bankAccountApi.get();
      return res.data || null;
    },
    enabled: !isEdit && isAuthenticated,
  });
  const hasBankAccount = isEdit || !!bankAccountQuery.data;
  const bankAccountLoading = bankAccountQuery.isLoading;
  // Okunamadı (ve elde eski veri yok): durum BİLİNMİYOR, "hesap yok" değil.
  const bankAccountError = bankAccountQuery.isError && bankAccountQuery.data === undefined;
  const refetchBankAccount = () => {
    void bankAccountQuery.refetch();
  };

  /**
   * Kargo paket kademesi tarifesi. Kartların etiketi ve örnek ölçüsü buradan
   * gelir; kod listesi de sunucudan, istemcide sabitlenmez.
   *
   * Tarife alınamazsa (backend 503 `SHIPPING_PACKAGE_TIERS_NOT_CONFIGURED`)
   * fail-closed davranıyoruz: seçim yapılamaz, `validate()` zaten boş kademeyi
   * reddeder — sessizce `small` varsayılan bir ilan açılmaz.
   */
  const packageTiersQuery = useQuery({
    queryKey: qk.shipping.packageTiers,
    queryFn: async () => {
      const res = await shippingApi.getPackageTiers();
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
  const packageTiers = packageTiersQuery.data?.tiers ?? [];
  const packageTiersLoading = packageTiersQuery.isLoading;
  const packageTiersError = packageTiersQuery.isError;

  // Kargo çıkış adresi kapısı (yalnız yeni ilan): adresi/cep numarası geçersiz
  // satıcının siparişinde koli açılamaz. Kural `_lib/dispatchAddress.ts`'te.
  const {
    hasDispatchAddress,
    needsFix: dispatchAddressNeedsFix,
    isLoading: dispatchAddressLoading,
    isError: dispatchAddressError,
    refetch: refetchDispatchAddress,
  } = useDispatchAddress(!isEdit && isAuthenticated);

  // İlan listesi/detay/ana sayfa ekranlarının bayat kalmaması için ilgili cache'leri
  // temizler — İlanlarım ile ORTAK küme (`_lib/invalidate`).
  const invalidateListingCaches = () => invalidateListingCachesShared(queryClient, productId);

  // #81 (hibrit): text alanları useZodForm'da; watch/setValue köprüsüyle mevcut
  // f.title/f.setTitle sözleşmesi korunur (section'lar değişmez), zod validasyon
  // submit'te form.trigger() ile devreye girer. Diğer alanlar useState kalır.
  const form = useZodForm(buildListingFormSchema(t), { defaultValues: emptyListingFormValues });
  const title = form.watch('title');
  const setTitle = (v: string) => form.setValue('title', v);
  const description = form.watch('description');
  const setDescription = (v: string) => form.setValue('description', v);
  const price = form.watch('price');
  const setPrice = (v: string) => form.setValue('price', v);
  const quantity = form.watch('quantity');
  const setQuantity = (v: string) => form.setValue('quantity', v);
  // Aktif takas/sipariş rezervasyonu (quantity − availableQuantity); alıcıların
  // gördüğü "satışta" sayısının fiziksel stoktan neden düşük olduğunu açıklar.
  const [reservedQty, setReservedQty] = useState(0);
  // #81: tüm form alanları useZodForm'da; watch/setValue köprüsü mevcut sözleşmeyi korur.
  const categoryId = form.watch('categoryId');
  const setCategoryId = (v: string) => form.setValue('categoryId', v);
  const condition = form.watch('condition');
  const setCondition = (v: string) => form.setValue('condition', v);
  const brandId = form.watch('brandId');
  const setBrandId = (v: string) => form.setValue('brandId', v);
  const carModelId = form.watch('carModelId');
  const setCarModelId = (v: string) => form.setValue('carModelId', v);
  const scale = form.watch('scale');
  const setScale = (v: string) => form.setValue('scale', v);
  const material = form.watch('material');
  const setMaterial = (v: string) => form.setValue('material', v);
  const manufacturerId = form.watch('manufacturerId');
  const setManufacturerId = (v: string) => form.setValue('manufacturerId', v);
  const modelCode = form.watch('modelCode');
  const setModelCode = (v: string) => form.setValue('modelCode', v);
  const year = form.watch('year');
  const setYear = (v: string) => form.setValue('year', v);
  const isTradeEnabled = form.watch('isTradeEnabled');
  const setIsTradeEnabled = (v: boolean) => form.setValue('isTradeEnabled', v);
  const isSet = form.watch('isSet');
  const setIsSet = (v: boolean) => form.setValue('isSet', v);
  const bundleSize = form.watch('bundleSize');
  const setBundleSize = (v: string) => form.setValue('bundleSize', v);
  // Renk (çoklu, en fazla MAX_COLORS) ve kutu durumu — sunucuda zorunlu.
  const colors = form.watch('colors');
  const toggleColor = (slug: string) => {
    const current = form.getValues('colors');
    if (current.includes(slug)) {
      form.setValue('colors', current.filter((c) => c !== slug));
    } else if (current.length < MAX_COLORS) {
      form.setValue('colors', [...current, slug]);
    }
  };
  const isBoxed = form.watch('isBoxed');
  const setIsBoxed = (v: 'boxed' | 'unboxed') => form.setValue('isBoxed', v);

  // Edit-only state
  const status = form.watch('status');
  const setStatus = (v: string) => form.setValue('status', v);
  const isPreorder = form.watch('isPreorder');
  const setIsPreorder = (v: boolean) => form.setValue('isPreorder', v);
  const shippingPackageTier = form.watch('shippingPackageTier');
  const setShippingPackageTier = (v: string) =>
    form.setValue('shippingPackageTier', v);
  const [salePrice, setSalePrice] = useState('');
  // Yeni ilanda web gibi bugün → +7 gün önerilir; indirimli fiyat girilmedikçe
  // payload'a girmez. Düzenlemede sunucudaki değerler (`applyMappedListing`).
  const [saleStartDate, setSaleStartDate] = useState(() =>
    isEdit ? '' : defaultSaleDates().saleStartDate,
  );
  const [saleEndDate, setSaleEndDate] = useState(() =>
    isEdit ? '' : defaultSaleDates().saleEndDate,
  );
  const [reactivateQuantity, setReactivateQuantity] = useState('');
  const [reactivating, setReactivating] = useState(false);
  const [removalOpen, setRemovalOpen] = useState(false);
  const [productLoading, setProductLoading] = useState(isEdit);
  const [productNotFound, setProductNotFound] = useState(false);

  // Görseller: TEK liste (ekran sırası = payload sırası, ilk = kapak); seçme, dosya başına
  // kuyruklu yükleme, sıralama ve çevirme `useListingImageUpload`'ta. Payload anahtarları
  // (`imageKeys`) yalnız sunucu anahtarlı kalemlerden türetilir.
  const imageUpload = useListingImageUpload({ maxImages: limits?.maxImagesPerListing });
  const { images, imageKeys, replaceImages, imagesRef } = imageUpload;

  // Data from API
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<CarModel[]>([]);
  const [scaleList, setScaleList] = useState<string[]>([]);
  const [materialList, setMaterialList] = useState<MaterialOption[]>([]);
  const [colorList, setColorList] = useState<ColorOption[]>([]);
  const [manufacturerList, setManufacturerList] = useState<Manufacturer[]>([]);

  // Manufacturer-scoped extra attributes. groupSlug -> selected attribute slugs.
  const [customAttributes, setCustomAttributes] = useState<Record<string, string[]>>({});

  // Genel özel gruplar (ör. Nadirlik/Bulunabilirlik) — üreticiden BAĞIMSIZ, tek
  // seçimli; zorunlu olanı sunucu oluşturmada şart koşuyor. Mobil bunları hiç
  // göstermiyordu (web "Ek Özellikler" kartı). Üretici değişince sıfırlanan
  // `customAttributes`'tan ayrı tutulur ki seçim kaybolmasın.
  const attrGroupsQuery = useQuery({
    queryKey: qk.products.attributeGroups,
    queryFn: async (): Promise<AttrGroup[]> => {
      const data = (await api.get('/products/attribute-groups')).data;
      // Beklenmedik gövde formu çökertmesin — liste değilse grup yok say.
      return Array.isArray(data) ? (data as AttrGroup[]) : [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const globalAttrGroups = globalCustomGroups(attrGroupsQuery.data ?? []);
  const globalAttrGroupsFailed = attrGroupsQuery.isError;
  const [globalAttributes, setGlobalAttributes] = useState<Record<string, string[]>>({});
  /** Tek seçim: aynı seçeneğe tekrar dokunmak seçimi kaldırır. */
  const setGlobalAttribute = (groupSlug: string, attrSlug: string) =>
    setGlobalAttributes((prev) => {
      const next = { ...prev };
      if (next[groupSlug]?.[0] === attrSlug) delete next[groupSlug];
      else next[groupSlug] = [attrSlug];
      return next;
    });
  const [manufacturerAttrGroups, setManufacturerAttrGroups] = useState<AttrGroup[]>([]);
  const [showAttrGroupPicker, setShowAttrGroupPicker] = useState<string | null>(null);
  // Holds prefilled manufacturer attributes (edit) until the groups finish loading,
  // so the manufacturer-change reset effect doesn't wipe them.
  const initialCustomAttrsRef = useRef<Record<string, string[]> | null>(null);
  // Marka/model/kategori/üretici adları için yedek — listeler yüklenene kadar
  // `.find()` boş döner, eşleyicinin etiketleri o boşluğu doldurur.
  const editLabelsRef = useRef<MappedListing['labels'] | null>(null);
  // Marka değişimini yakalar: değişince eski markanın model ADI geçersizleşir.
  const prevBrandIdRef = useRef<string | null>(null);

  // Loading flags
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limitsLoading, setLimitsLoading] = useState(!isEdit);

  // Listing limits (create only)
  const [listingLimits, setListingLimits] = useState<ListingLimits | null>(null);

  // Komisyon önizlemesi — indirim BUGÜN geçerliyse indirimli fiyattan sorulur
  // (create + edit; web düzenleme ekranı hâlâ normal fiyatı kullanıyor).
  const saleFields = { price, salePrice, saleStartDate, saleEndDate };
  const { commissionPreview, commissionLoading, commissionError, commissionEnabled } =
    useCommissionPreview(commissionPreviewAmount(saleFields), categoryId, shippingPackageTier);
  const saleStartsOn = saleStartsLater(saleFields);

  // Picker modal visibility
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showManufacturerPicker, setShowManufacturerPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Search within modals
  const [brandSearch, setBrandSearch] = useState('');
  const [manufacturerSearch, setManufacturerSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // -----------------------------------------------------------------------
  // Auth gate (create only — edit is always reached authenticated)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (authLoading || isEdit) return;
    if (!isAuthenticated) {
      appAlert(t('listing.loginRequiredTitle'), t('product.loginRequiredToCreate'), [
        { text: t('common.login'), onPress: () => router.push('/(auth)/login') },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  }, [isAuthenticated, authLoading, isEdit, t]);

  // -----------------------------------------------------------------------
  // Initial data loading
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchCategories();
    fetchFilters();
    if (!isEdit) {
      refreshUserData().then(() => updateListingLimits());
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (!isEdit && user && limits) updateListingLimits();
  }, [user, limits]);

  // -----------------------------------------------------------------------
  // Edit: fetch product and prefill the form
  // -----------------------------------------------------------------------

  /**
   * Formu sunucunun `edit` projeksiyonuna eşitleyen TEK yer.
   *
   * Hem ilk yükleme hem 409 (yazım çakışması) dalı bunu çağırır — iki yolun
   * ayrı ayrı yazılması, 409'dan sonra nitelik seçimlerinin ve rezerve adedin
   * eski oturumdan kalmasına yol açıyordu; oysa kullanıcıya "en güncel hali
   * yüklendi" deniyor.
   */
  const applyMappedListing = (mapped: MappedListing) => {
    form.reset(mapped.values);
    setReservedQty(mapped.reservedQty);
    replaceImages(imagesFromMapped(mapped.images));
    setSalePrice(mapped.sale.salePrice);
    setSaleStartDate(mapped.sale.saleStartDate);
    setSaleEndDate(mapped.sale.saleEndDate);
    // YALNIZ üretici-kapsamlı nitelikler: `scale`/`material` gibi
    // üretici-bağımsız gruplar formda kendi alanlarına sahip, arayüzde
    // seçilemez ve `attributes[]` payload'ına girerlerse satıcının bilerek
    // yaptığı ölçek/malzeme değişikliğini geri yazarlar.
    const scoped = mapped.manufacturerAttrs;
    setCustomAttributes(scoped);
    setGlobalAttributes(mapped.globalAttrs);
    // Ref YALNIZ bir köprüdür: üretici-grup efekti henüz çalışmadıysa (gruplar
    // boş) seçimleri ona taşır, efekt de tüketip `null`'lar. Gruplar ZATEN
    // yüklüyken (409 dalı) kurmak, ref'in tüketilmeden asılı kalmasına yol
    // açardı — sonraki üretici değişiminde efekt onu görüp ESKİ üreticinin
    // niteliklerini geri yazar, arayüzde hiç görünmeden `attributes[]`
    // payload'ına girerlerdi. Kural burada, tek yerde.
    initialCustomAttrsRef.current =
      manufacturerAttrGroups.length === 0 && Object.keys(scoped).length ? scoped : null;
    editLabelsRef.current = mapped.labels;
  };

  useEffect(() => {
    if (!isEdit || !productId) return;
    let cancelled = false;
    (async () => {
      setProductLoading(true);
      try {
        const res = await productsApi.getMyById(productId);
        const mapped = toFormValues((res.data?.data ?? res.data) as MyProductResponse);
        if (cancelled) return;
        if (!mapped) {
          setProductNotFound(true);
          return;
        }

        // Şema alanları tek seferde; tek tek setter çağırmak yerine form.reset.
        applyMappedListing(mapped);
      } catch {
        if (!cancelled) setProductNotFound(true);
      } finally {
        if (!cancelled) setProductLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, productId]);

  // -----------------------------------------------------------------------
  // Fetch models when brand changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    // Marka GERÇEKTEN değiştiyse (prefill'in '' → id geçişi değil) eski
    // markanın model adı geçersizdir: yedek etiket olarak kalırsa `models`
    // listesi tazelenirken uyumsuz `carModelId`'yi maskeler.
    if (prevBrandIdRef.current && prevBrandIdRef.current !== brandId && editLabelsRef.current) {
      editLabelsRef.current = { ...editLabelsRef.current, carModelName: '' };
    }
    prevBrandIdRef.current = brandId;

    if (brandId) {
      const selected = brands.find((b) => b.id === brandId);
      if (selected) fetchModels(selected.slug);
    } else {
      setModels([]);
    }
  }, [brandId, brands]);

  // -----------------------------------------------------------------------
  // Fetch manufacturer-scoped attribute groups when manufacturer changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    const selected = manufacturerList.find((m) => m.id === manufacturerId);
    if (!selected) {
      setManufacturerAttrGroups([]);
      if (!initialCustomAttrsRef.current) setCustomAttributes({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/products/attribute-groups', {
          params: { manufacturer: selected.slug },
        });
        if (cancelled) return;
        const groups = (res.data ?? []) as AttrGroup[];
        // Render only scoped groups; global ones (scale, material) have dedicated fields.
        setManufacturerAttrGroups(groups.filter((g) => g.manufacturerSlug === selected.slug));
        if (initialCustomAttrsRef.current) {
          setCustomAttributes(initialCustomAttrsRef.current);
          initialCustomAttrsRef.current = null;
        } else {
          setCustomAttributes({});
        }
      } catch (error) {
        logger.error('Failed to fetch manufacturer attribute groups', { err: safeError(error) });
        if (!cancelled) {
          setManufacturerAttrGroups([]);
          if (!initialCustomAttrsRef.current) setCustomAttributes({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manufacturerId, manufacturerList]);

  // -----------------------------------------------------------------------
  // API Calls
  // -----------------------------------------------------------------------
  const fetchCategories = async () => {
    try {
      const res = await categoriesApi.getAll();
      const cats = res.data?.data || res.data || [];
      setCategories(cats);
    } catch {
      toast.error(t('listing.categoriesLoadFailed'));
    }
  };

  const fetchFilters = async () => {
    setBrandsLoading(true);
    try {
      const res = await api.get('/products/filters');
      const data = res.data as {
        scales?: string[];
        materials?: MaterialOption[];
        colors?: ColorOption[];
        brands?: Brand[];
        manufacturers?: Manufacturer[];
      };
      if (data.scales?.length) setScaleList(data.scales);
      if (data.materials?.length) setMaterialList(data.materials);
      if (data.colors?.length) setColorList(data.colors);
      if (data.brands?.length) setBrands(data.brands);
      if (data.manufacturers?.length) setManufacturerList(data.manufacturers);
    } catch {
      toast.error(t('listing.filtersLoadFailed'));
    } finally {
      setBrandsLoading(false);
    }
  };

  const fetchModels = async (brandSlug: string) => {
    setModelsLoading(true);
    setModels([]);
    try {
      const res = await api.get('/car-models', { params: { brand: brandSlug } });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setModels(data);
    } catch {
      toast.error(t('listing.modelsLoadFailed'));
    } finally {
      setModelsLoading(false);
    }
  };

  const updateListingLimits = async () => {
    setLimitsLoading(true);
    try {
      const res = await api.get('/products/my/stats', { params: { _t: Date.now() } });
      const stats = res.data;
      const tierName = stats.limits?.tierName || 'Free';
      const tierType = stats.limits?.tierType || 'free';
      const isPremium = tierType === 'premium' || tierType === 'business';
      const maxListings = stats.summary?.max || 10;
      const used = stats.summary?.used || 0;
      const remaining = stats.summary?.remaining || 0;
      const canCreate = stats.summary?.canCreate ?? true;

      setListingLimits({
        currentCount: used,
        maxListings,
        canCreateListing: canCreate,
        isPremium,
        membershipTier: tierName,
        remainingListings: remaining,
      });
    } catch {
      // Stats çekilemezse: yanıltıcı sayı GÖSTERME ve kullanıcıyı BLOKLAMA.
      // (user.listingCount ömür-boyu toplamdır, kotayı yanlış şişirir.) Sunucu POST'ta zaten doğrular.
      const membershipTier = user?.membershipTier || 'free';
      const isPremium = membershipTier === 'premium' || membershipTier === 'business';

      setListingLimits({
        currentCount: 0,
        maxListings: -1,
        canCreateListing: true,
        isPremium,
        membershipTier,
        remainingListings: -1,
      });
    } finally {
      setLimitsLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Category helpers
  // -----------------------------------------------------------------------
  const flattenCategories = (cats: Category[]): Category[] => {
    const result: Category[] = [];
    cats.forEach((cat) => {
      result.push(cat);
      if (cat.children?.length) result.push(...flattenCategories(cat.children));
    });
    return result;
  };

  const flatCategories = flattenCategories(categories).filter(
    (c) => !BRAND_SLUGS.includes(c.slug) && !SCALE_SLUGS.includes(c.slug)
  );
  /**
   * Etiket yedeği YALNIZ ilgili liste HENÜZ YÜKLENMEMİŞKEN (`length === 0`)
   * devrededir.
   *
   * Liste geldiğinde `.find()` tek otoritedir: eşleşme yoksa picker
   * "… Seçin" gösterir ve satıcı uyumsuzluğu GÖRÜR. Yedeği `??` ile
   * koşulsuz zincirlemek, marka değişince eski markanın model adını
   * göstermeye devam ediyor ve bayat `carModelId`'yi maskeliyordu.
   */
  const labelFallback = <T extends { id: string; name: string; slug: string }>(
    list: readonly unknown[],
    id: string,
    name: string | undefined,
  ): T | undefined =>
    list.length === 0 && !!id && !!name ? ({ id, name, slug: '' } as T) : undefined;

  const selectedCategory =
    flatCategories.find((c) => c.id === categoryId) ??
    labelFallback<Category>(flatCategories, categoryId, editLabelsRef.current?.categoryName);
  const selectedBrand =
    brands.find((b) => b.id === brandId) ??
    labelFallback<Brand>(brands, brandId, editLabelsRef.current?.brandName);
  const selectedModel =
    models.find((m) => m.id === carModelId) ??
    labelFallback<CarModel>(models, carModelId, editLabelsRef.current?.carModelName);
  const selectedManufacturer =
    manufacturerList.find((m) => m.id === manufacturerId) ??
    labelFallback<Manufacturer>(
      manufacturerList,
      manufacturerId,
      editLabelsRef.current?.manufacturerName,
    );
  const effectiveScales = scaleList.length > 0 ? scaleList : FALLBACK_SCALES;
  const effectiveMaterials = materialList.length > 0 ? materialList : buildMaterials(t);
  const selectedMaterial = effectiveMaterials.find((m) => m.slug === material);

  const listPriceNum = Number(price) || 0;
  const salePriceNum = Number(salePrice) || 0;
  const discountPercent =
    listPriceNum > 0 && salePriceNum > 0 && salePriceNum < listPriceNum
      ? Math.round((1 - salePriceNum / listPriceNum) * 100)
      : 0;

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------
  const buildBasePayload = () => {
    const customAttributeSlugs = [
      ...Object.values(customAttributes),
      ...Object.values(globalAttributes),
    ].flat().filter(Boolean);
    return {
      title,
      description: description || undefined,
      price: Number(price),
      categoryId,
      condition,
      brandId: brandId || undefined,
      carModelId: carModelId || undefined,
      scale: scale || undefined,
      material: material || undefined,
      manufacturerId: manufacturerId || undefined,
      // `carModelId || undefined` deseninin AKSİNE: boş string burada da
      // gönderilir — sunucu opsiyonel kabul eder ve boş string alanı temizler.
      modelCode,
      year: year ? Number(year) : undefined,
      isTradeEnabled,
      isSet,
      // Sunucu kademeyi `edit.shippingPackageTier` ile geri döndürüyor
      // (2026-08-10 ölçümü), yani form onu HEP dolu açar. Koşullu göndermek
      // artık satıcının BİLEREK yaptığı değişikliği yutardı.
      shippingPackageTier,
      bundleSize: isSet && Number(bundleSize) >= 2 ? Number(bundleSize) : undefined,
      images: imageKeys.length > 0 ? imageKeys : undefined,
      // Düzenlemede boş liste `[]` GİDER: sunucu `PATCH` + `attributes` ile tüm
      // özel grup bağlarını listeyle değiştirir; `undefined` (alanı hiç
      // göndermemek) kullanıcının temizlediği seçimi sunucuda bırakırdı
      // (delta 19). Oluşturmada boş liste gereksiz, alan atlanır.
      attributes: isEdit || customAttributeSlugs.length > 0 ? customAttributeSlugs : undefined,
      ...buildColorAndBoxPayload({ colors, isBoxed }),
    } as Record<string, any>;
  };

  /**
   * İndirim alanları — `POST /products` de artık kabul ediyor (delta 18 §2b).
   * `price` formdaki indirim ÖNCESİ normal fiyattır; sunucu
   * `salePrice < max(originalPrice, price)` ise ürünü indirimli açar, aksi
   * halde indirim alanlarını yok sayar. Etkin fiyatı İSTEMCİ TÜRETMEZ.
   */
  const buildSalePayload = (): Record<string, unknown> => ({ ...salePayload(saleFields) });

  const validate = (): boolean => {
    // Görsel yüklemesi/çevirmesi sürerken ya da yüklenemeyen görsel varken kaydedilen ilan,
    // ekrandakinden farklı (eksik ya da çevrilmemiş) görselle giderdi — payload yalnız sunucu
    // anahtarlı kalemleri taşır (web `imageSubmitBlocker`). Güncel liste ref'ten okunur.
    const imageBlocker = imageSubmitBlocker(imagesRef.current);
    if (imageBlocker) {
      toast.error(
        t(imageBlocker === 'pending' ? 'product.imageUpload.blockerPending' : 'product.imageUpload.blockerFailed'),
      );
      return false;
    }
    // Kurallar ve SIRALARI tek yerde (`_lib/validate.ts`) — kullanıcıya
    // gösterilecek tek mesajı o sıra belirliyor.
    const error = firstListingValidationError(t, {
      values: form.getValues(),
      categoryId,
      imageCount: imageKeys.length,
      isEdit,
      requiredGlobalGroups: requiredGlobalGroups(globalAttrGroups),
      attributeSelections: { ...customAttributes, ...globalAttributes },
    });
    if (error) {
      toast.error(error);
      return false;
    }
    return true;
  };

  /**
   * Gönderim re-entry guard'ı. `isSubmitting` state'i bir sonraki render'a kadar güncellenmez:
   * aynı karede gelen iki dokunuş ikisi de `false` görüp `productsApi.create`'i iki kez
   * çağırır (çift ilan). Ref senkron okunur, ikinci çağrı daha girişte kesilir.
   */
  const submitInFlightRef = useRef(false);
  const handleSubmit = async () => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    try {
      await submitListing();
    } finally {
      submitInFlightRef.current = false;
    }
  };

  const submitListing = async () => {
    if (!validate()) return;

    // GÖNDERİM KAPISI — `ListingRequirementGate` ile AYNI kaynak (`listingGateView`), iki guard
    // aynı semantiği izler. Form normalde bu durumda gizli; bu blok kapıyı aşan her yolu
    // (hızlı çift dokunma, gecikmiş sorgu) sunucuya gitmeden keser:
    //  - durum BİLİNMİYOR (yükleniyor / hata): gönderim engellenir ama "IBAN/adres ekle" DENMEZ;
    //    "doğrulanıyor / tekrar dene" gösterilir (hata ise yeniden dene düğmesiyle).
    //  - KESİN eksik: ekleme istemi (önce IBAN, sonra adres).
    const gate = listingGateView({
      isEdit,
      hasBankAccount,
      bankAccountLoading,
      bankAccountError,
      hasDispatchAddress,
      dispatchAddressLoading,
      dispatchAddressError,
    });
    if (gate.view === 'error') {
      appAlert(t('listing.requirementsErrorTitle'), t('listing.requirementsErrorBody'), [
        { text: t('listing.dismiss'), style: 'cancel' },
        {
          text: t('common.tryAgain'),
          onPress: () => {
            if (gate.bank === 'error') refetchBankAccount();
            if (gate.address === 'error') refetchDispatchAddress();
          },
        },
      ]);
      return;
    }
    if (gate.view === 'loading') {
      appAlert(t('listing.requirementsPendingTitle'), t('listing.requirementsPendingBody'));
      return;
    }
    if (gate.bank === 'missing') {
      appAlert(
        t('listing.bankAccountRequiredTitle'),
        t('listing.bankAccountRequiredBody'),
        [
          { text: t('listing.dismiss'), style: 'cancel' },
          { text: t('listing.addIban'), onPress: () => router.push(BANK_ACCOUNT_FROM_LISTING_HREF) },
        ],
      );
      return;
    }
    if (gate.address === 'missing') {
      appAlert(
        t(dispatchAddressNeedsFix ? 'listing.dispatchAddressFixTitle' : 'listing.dispatchAddressRequiredTitle'),
        t('address.dispatchPromptDesc'),
        [
          { text: t('listing.dismiss'), style: 'cancel' },
          {
            text: t(dispatchAddressNeedsFix ? 'address.dispatchFixButton' : 'address.dispatchAddButton'),
            onPress: () => router.push('/settings/addresses'),
          },
        ],
      );
      return;
    }

    if (!isEdit && listingLimits && !listingLimits.canCreateListing) {
      appAlert(
        t('listing.limitExceededTitle'),
        CAN_BUY_DIGITAL
          ? t('listing.limitExceededBody', {
              count: listingLimits.currentCount,
              max: listingLimits.maxListings,
            })
          : t('listing.limitReachedInfo', { count: listingLimits.currentCount })
      );
      return;
    }

    // B-2.4: yeni ilan yayımlanmadan yasal kimlik; vazgeçerse ilan gönderilmez.
    // Düzenlemede sorulmaz (ilan zaten verildi).
    if (!isEdit) {
      if (!(await requireIdentity())) return;
      // Kapı dakikalarca açık kalabilir (bu arada görsel yüklemesi biter, alan
      // değişir): payload bu closure'dan DEĞİL, son commit'in durumundan kurulur.
      await publishAfterGateRef.current();
      return;
    }
    await publish();
  };

  /**
   * Kimlik kapısından sonra, SON commit'in form durumuyla: kurallar yeniden
   * koşar (kapı açıkken değişen durum geçersiz olabilir), sonra gönderim.
   */
  const publishAfterGate = async () => {
    if (!validate()) return;
    await publish();
  };
  // useEvent kalıbı — atama `useLayoutEffect`'te, render sırasında değil.
  const publishAfterGateRef = useLatestRef(publishAfterGate);

  /** Gönderim: oluşturma (`POST`) ya da düzenleme (`PATCH`) + sonuç uyarısı. */
  const publish = async () => {
    setIsSubmitting(true);
    try {
      if (!isEdit) {
        await productsApi.create({
          ...buildBasePayload(),
          ...buildSalePayload(),
          isPreorder: false,
          // Boş bırakılırsa 1 adet — sınırsız (null) stok bilinçli bir seçim değil, default değil.
          quantity: quantity ? Number(quantity) : 1,
        });

        invalidateListingCaches();
        // Önce ekran değişir, sonra toast — "Tamam" bekletme yok. Kalan istekler (yetki / limit
        // tazeleme) ekran değiştikten sonra sürer.
        resetForm();
        router.push('/settings/my-listings');
        toast.success(t('product.listingCreated'));
        // İlan oluştu: tazeleme hatası "oluşturulamadı" uyarısına düşmesin (form zaten sıfır →
        // kullanıcı yinelenen ilan göndermesin). Yalnız günlüğe.
        refreshUserData()
          .then(() => updateListingLimits())
          .catch((e) => logger.warn('[listing] create sonrası tazeleme başarısız', { err: safeError(e) }));
      } else {
        const payload: Record<string, any> = {
          ...buildBasePayload(),
          ...buildSalePayload(),
          isPreorder,
          quantity: quantity !== '' ? Number(quantity) : null,
          status,
        };

        await productsApi.update(productId!, payload);
        invalidateListingCaches();

        goBackOrHome();
        toast.success(t('product.listingUpdated'));
      }
    } catch (err: any) {
      // İyimser kilit / atomik görsel yazımı çakışması (delta 18 §2d).
      // Yerel formu kaydedilmiş SAYMA: sunucudaki güncel kaydı çek ve
      // kullanıcıya çakışmayı bildir.
      if (err?.response?.status === 409 && isEdit) {
        try {
          const fresh = await productsApi.getMyById(productId!);
          const mapped = toFormValues((fresh.data?.data ?? fresh.data) as MyProductResponse);
          // İlk yüklemedeki prefill ile AYNI durum: nitelikler ve rezerve adet
          // dahil. Aksi halde "en güncel hali yüklendi" mesajı yalan olurdu.
          if (mapped) applyMappedListing(mapped);
        } catch {
          // Yeniden çekme de başarısızsa formu olduğu gibi bırak; aşağıdaki
          // uyarı yine çıkar ve kullanıcı kaydedilmediğini bilir.
        }
        appAlert(t('common.error'), t('product.listingChangedElsewhere'));
        return;
      }

      appAlert(
        t('common.error'),
        serverErrorMessage(err, isEdit ? t('product.updateFailed') : t('product.failedToCreateListing')),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    const qty = Number(reactivateQuantity);
    if (!qty || qty < 1) {
      toast.error(t('listing.invalidQuantity'));
      return;
    }
    setReactivating(true);
    try {
      const response = await productsApi.update(productId!, { status: 'active', quantity: qty });
      // API'nin gerçekten döndürdüğü statü: çoğu ilan `pending`, iade
      // karantinasındaki ilan doğrudan `active` (bkz. listing/_lib/activation).
      setStatus(activatedStatus(response));
      setQuantity(String(qty));
      invalidateListingCaches();
      toast.success(t(activationMessageKey(response)));
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t('listing.reactivateFailed')));
    } finally {
      setReactivating(false);
    }
  };

  // Silme önce NEDEN sorar (web ile aynı; `ListingRemovalModal`). Onay metni pencerenin kendisidir.
  const handleDelete = () => setRemovalOpen(true);

  /** Pencere kapandıktan SONRA çağrılır; mutasyon + uyarı `useDeleteListing`te. */
  const deleteListing = useDeleteListing(productId);
  const deleteWithReason = (removal: ListingRemovalPayload) => deleteListing.mutate(removal);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setQuantity('1');
    setCategoryId('');
    setCondition('very_good');
    setBrandId('');
    setCarModelId('');
    setScale('1:64');
    setMaterial('');
    setManufacturerId('');
    setModelCode('');
    setYear('');
    setIsTradeEnabled(false);
    setIsSet(false);
    form.setValue('colors', []);
    form.setValue('isBoxed', '');
    setGlobalAttributes({});
    replaceImages([]);
    setSalePrice('');
    const sale = defaultSaleDates();
    setSaleStartDate(sale.saleStartDate);
    setSaleEndDate(sale.saleEndDate);
  };

  return {
    // mode
    isEdit,
    limits,
    // auth / gate
    isAuthenticated,
    authLoading,
    productLoading,
    productNotFound,
    hasBankAccount,
    bankAccountQuery,
    bankAccountLoading,
    bankAccountError,
    refetchBankAccount,
    hasDispatchAddress,
    dispatchAddressNeedsFix,
    dispatchAddressLoading,
    dispatchAddressError,
    refetchDispatchAddress,
    // limits
    limitsLoading,
    listingLimits,
    // shared fields
    title, setTitle,
    description, setDescription,
    price, setPrice,
    quantity, setQuantity,
    reservedQty,
    categoryId, setCategoryId,
    condition, setCondition,
    brandId, setBrandId,
    carModelId, setCarModelId,
    scale, setScale,
    material, setMaterial,
    manufacturerId, setManufacturerId,
    modelCode, setModelCode,
    year, setYear,
    isTradeEnabled, setIsTradeEnabled,
    isSet, setIsSet,
    bundleSize, setBundleSize,
    colors, toggleColor, colorList,
    isBoxed, setIsBoxed,
    // edit-only fields
    status, setStatus,
    isPreorder, setIsPreorder,
    shippingPackageTier, setShippingPackageTier,
    packageTiers, packageTiersLoading, packageTiersError,
    salePrice, setSalePrice,
    saleStartDate, setSaleStartDate,
    saleEndDate, setSaleEndDate,
    reactivateQuantity, setReactivateQuantity,
    reactivating,
    // images (`useListingImageUpload`)
    images,
    imageKeys,
    maxImages: imageUpload.maxImages,
    uploadingImages: imageUpload.uploadingImages,
    imageSubmitBlocker: imageUpload.submitBlocker,
    pickImages: imageUpload.pickImages,
    retryImage: imageUpload.retryImage,
    removeImage: imageUpload.removeImage,
    moveImage: imageUpload.moveImage,
    shiftImage: imageUpload.shiftImage,
    makeCoverImage: imageUpload.makeCoverImage,
    rotateImage: imageUpload.rotateImage,
    imageDragActive: imageUpload.imageDragActive,
    setImageDragActive: imageUpload.setImageDragActive,
    // data
    brands,
    models,
    manufacturerList,
    // custom attrs
    customAttributes, setCustomAttributes,
    manufacturerAttrGroups,
    globalAttrGroups, globalAttrGroupsFailed,
    globalAttributes, setGlobalAttribute,
    showAttrGroupPicker, setShowAttrGroupPicker,
    // loading flags
    brandsLoading,
    modelsLoading,
    // Kimlik kontrolü/kapısı süresince de devre dışı (ikinci basış yok).
    isSubmitting: isSubmitting || checkingIdentity || deleteListing.isPending,
    // commission
    commissionPreview,
    commissionLoading,
    commissionError,
    commissionEnabled,
    saleStartsOn,
    // picker visibility
    showCategoryPicker, setShowCategoryPicker,
    showBrandPicker, setShowBrandPicker,
    showModelPicker, setShowModelPicker,
    showMaterialPicker, setShowMaterialPicker,
    showManufacturerPicker, setShowManufacturerPicker,
    showYearPicker, setShowYearPicker,
    // search
    brandSearch, setBrandSearch,
    manufacturerSearch, setManufacturerSearch,
    categorySearch, setCategorySearch,
    // derived
    flatCategories,
    selectedCategory,
    selectedBrand,
    selectedModel,
    selectedManufacturer,
    effectiveScales,
    effectiveMaterials,
    selectedMaterial,
    discountPercent,
    // handlers
    handleSubmit,
    handleReactivate,
    handleDelete,
    removalOpen,
    closeRemoval: () => setRemovalOpen(false),
    deleteWithReason,
  };
}

export type ListingFormController = ReturnType<typeof useListingForm>;
