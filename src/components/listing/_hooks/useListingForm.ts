import { logger, safeError } from '@/services/logger';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { router } from 'expo-router';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useWatch } from 'react-hook-form';
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
import { defaultSaleDates, salePayload } from '../_lib/sale';
import { priceLimitHint, type PriceBaseline } from '../_lib/priceRules';
import { usePriceLimits } from '@/hooks/usePriceLimits';
import { useRequireLegalIdentity } from '@/hooks/useLegalIdentity';
import { useLatestRef } from '@/hooks/useLatestRef';
import { useStableCallback } from '@/hooks/useStableCallback';
import { useListingCatalog } from './useListingCatalog';
import { useListingQuota } from './useListingQuota';

import { useAuthStore } from '../../../stores/authStore';
import { api, productsApi, bankAccountApi, shippingApi, type ListingRemovalPayload } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { qk } from '@/lib/query';
import type {
  Category,
  Brand,
  CarModel,
  Manufacturer,
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
 *
 * Performans: serbest metin alanları (başlık, açıklama, model kodu, set adedi) controller'da
 * İZLENMEZ — `FormTextField` (useController) kendi alanını çizer, değerler gönderimde
 * `getValues()` ile okunur. Fiyat/adet de İZLENMEZ: türetmeleri (fiyat hatası, indirim yüzdesi,
 * komisyon önizlemesi) yaprakta `useListingPricing` hesaplar. Yalnız mantığı süren alanlar
 * `useWatch` ile izlenir (kategori, marka, üretici, seçimler). Bölümlere giden işleyiciler
 * referans-kararlı; bölümler `memoSection` ile yalnız okudukları alan değişince çizilir.
 */
// Sabit boş dizi: `?? []` her render'da yeni referans üretip memo'lu kargo bölümünü çizdirirdi.
const NO_TIERS: never[] = [];

export function useListingForm({ mode, productId }: ListingFormProps) {
  const isEdit = mode === 'edit';
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { requireIdentity, isChecking: checkingIdentity } = useRequireLegalIdentity();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const limits = useAuthStore((s) => s.limits);
  const refreshUserData = useAuthStore((s) => s.refreshUserData);

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
  const packageTiers = packageTiersQuery.data?.tiers ?? NO_TIERS;
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
  const { control, setValue, getValues } = form;
  /**
   * YALNIZ mantığı süren alanlar izlenir (`useWatch`): seçimler dokunuşla değişir. Başlık/
   * açıklama/model kodu/set adedi ve fiyat/adet İZLENMEZ — tuş vuruşu controller'ı ve formun
   * geri kalanını yeniden çizmesin diye alanlar kendi değerini okur (`FormTextField`,
   * `useListingPricing`); gönderimde `getValues()`.
   */
  const [
    categoryId,
    condition,
    brandId,
    carModelId,
    scale,
    material,
    manufacturerId,
    year,
    isTradeEnabled,
    isSet,
    colors,
    isBoxed,
    status,
    isPreorder,
    shippingPackageTier,
  ] = useWatch({
    control,
    name: [
      'categoryId',
      'condition',
      'brandId',
      'carModelId',
      'scale',
      'material',
      'manufacturerId',
      'year',
      'isTradeEnabled',
      'isSet',
      'colors',
      'isBoxed',
      'status',
      'isPreorder',
      'shippingPackageTier',
    ],
  });
  // Aktif takas/sipariş rezervasyonu (quantity − availableQuantity); alıcıların
  // gördüğü "satışta" sayısının fiziksel stoktan neden düşük olduğunu açıklar.
  const [reservedQty, setReservedQty] = useState(0);
  // Setter'lar referans-kararlı (`setValue` RHF'de sabit): memo'lu bölümler boşa çizilmesin.
  const setters = useMemo(
    () => ({
      setTitle: (v: string) => setValue('title', v),
      setDescription: (v: string) => setValue('description', v),
      setPrice: (v: string) => setValue('price', v),
      setQuantity: (v: string) => setValue('quantity', v),
      setCategoryId: (v: string) => setValue('categoryId', v),
      setCondition: (v: string) => setValue('condition', v),
      setBrandId: (v: string) => setValue('brandId', v),
      setCarModelId: (v: string) => setValue('carModelId', v),
      setScale: (v: string) => setValue('scale', v),
      setMaterial: (v: string) => setValue('material', v),
      setManufacturerId: (v: string) => setValue('manufacturerId', v),
      setModelCode: (v: string) => setValue('modelCode', v),
      setYear: (v: string) => setValue('year', v),
      setIsTradeEnabled: (v: boolean) => setValue('isTradeEnabled', v),
      setIsSet: (v: boolean) => setValue('isSet', v),
      setBundleSize: (v: string) => setValue('bundleSize', v),
      setIsBoxed: (v: 'boxed' | 'unboxed') => setValue('isBoxed', v),
      setStatus: (v: string) => setValue('status', v),
      setIsPreorder: (v: boolean) => setValue('isPreorder', v),
      setShippingPackageTier: (v: string) => setValue('shippingPackageTier', v),
      // Renk (çoklu, en fazla MAX_COLORS) ve kutu durumu — sunucuda zorunlu.
      toggleColor: (slug: string) => {
        const current = getValues('colors');
        if (current.includes(slug)) {
          setValue('colors', current.filter((c) => c !== slug));
        } else if (current.length < MAX_COLORS) {
          setValue('colors', [...current, slug]);
        }
      },
    }),
    [setValue, getValues],
  );
  const {
    setTitle,
    setDescription,
    setPrice,
    setQuantity,
    setCategoryId,
    setCondition,
    setBrandId,
    setCarModelId,
    setScale,
    setMaterial,
    setManufacturerId,
    setModelCode,
    setYear,
    setIsTradeEnabled,
    setIsSet,
    setBundleSize,
    setIsBoxed,
    setStatus,
    setIsPreorder,
    setShippingPackageTier,
    toggleColor,
  } = setters;

  // Edit-only state
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

  // Katalog (kategori ağacı, filtre seçenekleri, markaya göre modeller) — React Query, ortak
  // `qk` anahtarları (bkz. `useListingCatalog`).
  const {
    flatCategories,
    brands,
    manufacturerList,
    colorList,
    effectiveScales,
    effectiveMaterials,
    brandsLoading,
    models,
    modelsLoading,
  } = useListingCatalog({ enabled: isAuthenticated && !authLoading, brandId });

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
  const globalAttrGroups = useMemo(
    () => globalCustomGroups(attrGroupsQuery.data ?? []),
    [attrGroupsQuery.data],
  );
  const globalAttrGroupsFailed = attrGroupsQuery.isError;
  const [globalAttributes, setGlobalAttributes] = useState<Record<string, string[]>>({});
  /** Tek seçim: aynı seçeneğe tekrar dokunmak seçimi kaldırır. */
  const setGlobalAttribute = useCallback(
    (groupSlug: string, attrSlug: string) =>
      setGlobalAttributes((prev) => {
        const next = { ...prev };
        if (next[groupSlug]?.[0] === attrSlug) delete next[groupSlug];
        else next[groupSlug] = [attrSlug];
        return next;
      }),
    [],
  );
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Listing limits (create only) — tek sorgu (`useListingQuota`): eskiden kullanıcı tazelemesi
  // bittikten SONRA ve `[user, limits]` efektiyle BİR KEZ DAHA sırayla çekiliyordu.
  const { listingLimits, limitsLoading } = useListingQuota({
    enabled: !isEdit && isAuthenticated && !authLoading,
    user,
    limits,
  });

  // İndirim alanları + GÜNCEL fiyat (fiyat izlenmez → gönderim anında formdan okunur).
  const currentSaleFields = () => ({ price: getValues('price'), salePrice, saleStartDate, saleEndDate });

  // Admin fiyat sınırları (yüklenemezse / boşsa kural yok — form asla bloklanmaz). Düzenlemede
  // yüklenen ilk fiyatlar taban altındaysa DEĞİŞTİRİLMEDİKÇE hata verilmez (eski kayıt muafiyeti).
  const { minPrice, maxPrice } = usePriceLimits();
  // Referans-kararlı: fiyat bölümünün memo anahtarı (`useListingPricing`).
  const priceLimits = useMemo(() => ({ minPrice, maxPrice }), [minPrice, maxPrice]);
  const [priceBaseline, setPriceBaseline] = useState<PriceBaseline | null>(null);
  // Limit hatası yazarken kırmızı yanmaz: alan terk edilince (blur) ya da gönderim denenince görünür
  // (ipucu satırı HEP görünür). Gönderim kapısı (`validate`) bundan bağımsız, her zaman çalışır.
  const [priceBlurred, setPriceBlurred] = useState(false);
  const [salePriceBlurred, setSalePriceBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Fiyat hatası / indirim yüzdesi / komisyon önizlemesi yaprakta: `useListingPricing`.
  const priceHint = priceLimitHint(t, priceLimits);

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

  // Misafir: giriş kapısı ekranın kendisi (`ListingGates` "Giriş Yapın" sayfası + buton);
  // üstüne aynı mesajlı ikinci bir uyarı açılmaz.

  // -----------------------------------------------------------------------
  // Initial data loading — katalog ve kota React Query'de (yukarıda); burada yalnız kullanıcı
  // tazelemesi (üyelik/hak). Kota sorgusu bununla PARALEL gider; üyelik değişirse kendi
  // anahtarıyla yeniden sorar.
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated || authLoading || isEdit) return;
    refreshUserData().catch((e) =>
      logger.warn('[listing] kullanıcı tazelemesi başarısız', { err: safeError(e) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

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
    setPriceBaseline(mapped.storedPrices);
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
  // Brand change — modeller `useListingCatalog`'ta markaya göre sorgulanır
  // -----------------------------------------------------------------------
  useEffect(() => {
    // Marka GERÇEKTEN değiştiyse (prefill'in '' → id geçişi değil) eski
    // markanın model adı geçersizdir: yedek etiket olarak kalırsa `models`
    // listesi tazelenirken uyumsuz `carModelId`'yi maskeler.
    if (prevBrandIdRef.current && prevBrandIdRef.current !== brandId && editLabelsRef.current) {
      editLabelsRef.current = { ...editLabelsRef.current, carModelName: '' };
    }
    prevBrandIdRef.current = brandId;
  }, [brandId]);

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
  // Category helpers (düzleştirilmiş liste `useListingCatalog`'ta, memo'lu)
  // -----------------------------------------------------------------------
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
  const selectedMaterial = effectiveMaterials.find((m) => m.slug === material);

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------
  const buildBasePayload = () => {
    // İzlenmeyen metin alanları gönderim anında formdan (bkz. `FormTextField`).
    const { title, description, modelCode, bundleSize } = getValues();
    const customAttributeSlugs = [
      ...Object.values(customAttributes),
      ...Object.values(globalAttributes),
    ].flat().filter(Boolean);
    return {
      title,
      description: description || undefined,
      price: Number(getValues('price')),
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
  const buildSalePayload = (): Record<string, unknown> => ({ ...salePayload(currentSaleFields()) });

  const validate = (): boolean => {
    setSubmitAttempted(true);
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
      priceLimits,
      sale: { salePrice, saleStartDate, saleEndDate },
      priceBaseline,
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
    // Adet izlenmez (yaprak alanı) → gönderim anında formdan.
    const quantity = getValues('quantity');
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
        // kullanıcı yinelenen ilan göndermesin). Yalnız günlüğe. Kota kartı ayrıca çekilmez:
        // `invalidateListingCaches` `myListingsStats` önekini (kota sorgusu dahil) tazeledi.
        refreshUserData().catch((e) =>
          logger.warn('[listing] create sonrası tazeleme başarısız', { err: safeError(e) }),
        );
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

  // Bölümlere giden işleyiciler referans-kararlı (useEvent kalıbı: her zaman SON commit'in
  // closure'ını çağırır) — memo'lu bölümler controller her render olduğunda yeniden çizilmesin.
  const stableHandleSubmit = useStableCallback(handleSubmit);
  const stableHandleReactivate = useStableCallback(handleReactivate);
  const stableHandleDelete = useStableCallback(handleDelete);
  const stableDeleteWithReason = useStableCallback(deleteWithReason);
  const closeRemoval = useCallback(() => setRemovalOpen(false), []);
  const onPriceBlur = useCallback(() => setPriceBlurred(true), []);
  const onSalePriceBlur = useCallback(() => setSalePriceBlurred(true), []);
  const pickImages = useStableCallback(imageUpload.pickImages);
  const retryImage = useStableCallback(imageUpload.retryImage);
  const removeImage = useStableCallback(imageUpload.removeImage);
  const moveImage = useStableCallback(imageUpload.moveImage);
  const shiftImage = useStableCallback(imageUpload.shiftImage);
  const makeCoverImage = useStableCallback(imageUpload.makeCoverImage);
  const rotateImage = useStableCallback(imageUpload.rotateImage);
  const blockerReason = imageUpload.submitBlocker?.reason;
  const blockerMessage = imageUpload.submitBlocker?.message;
  const imageSubmitBlockerValue = useMemo(
    () => (blockerReason && blockerMessage ? { reason: blockerReason, message: blockerMessage } : null),
    [blockerReason, blockerMessage],
  );

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
    // RHF formu — serbest metin alanları (`FormTextField`) buna bağlanır.
    form,
    // shared fields (başlık/açıklama/model kodu/set adedi izlenmez: `FormTextField`)
    setTitle,
    setDescription,
    setPrice,
    priceHint, onPriceBlur,
    // Fiyat türetmelerinin girdileri (`useListingPricing` yaprakta okur).
    priceLimits, priceBaseline, priceBlurred, salePriceBlurred, submitAttempted,
    setQuantity,
    reservedQty,
    categoryId, setCategoryId,
    condition, setCondition,
    brandId, setBrandId,
    carModelId, setCarModelId,
    scale, setScale,
    material, setMaterial,
    manufacturerId, setManufacturerId,
    setModelCode,
    year, setYear,
    isTradeEnabled, setIsTradeEnabled,
    isSet, setIsSet,
    setBundleSize,
    colors, toggleColor, colorList,
    isBoxed, setIsBoxed,
    // edit-only fields
    status, setStatus,
    isPreorder, setIsPreorder,
    shippingPackageTier, setShippingPackageTier,
    packageTiers, packageTiersLoading, packageTiersError,
    salePrice, setSalePrice, onSalePriceBlur,
    saleStartDate, setSaleStartDate,
    saleEndDate, setSaleEndDate,
    reactivateQuantity, setReactivateQuantity,
    reactivating,
    // images (`useListingImageUpload`)
    images,
    imageKeys,
    maxImages: imageUpload.maxImages,
    uploadingImages: imageUpload.uploadingImages,
    imageSubmitBlocker: imageSubmitBlockerValue,
    pickImages,
    retryImage,
    removeImage,
    moveImage,
    shiftImage,
    makeCoverImage,
    rotateImage,
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
    // handlers
    handleSubmit: stableHandleSubmit,
    handleReactivate: stableHandleReactivate,
    handleDelete: stableHandleDelete,
    removalOpen,
    closeRemoval,
    deleteWithReason: stableDeleteWithReason,
  };
}

export type ListingFormController = ReturnType<typeof useListingForm>;
