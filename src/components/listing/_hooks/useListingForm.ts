import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { listingFormSchema, emptyListingFormValues } from '../_lib/schema';
import { firstListingValidationError } from '../_lib/validate';
import { toFormValues } from '../_lib/editMapper';

import { useAuthStore } from '../../../stores/authStore';
import { api, productsApi, categoriesApi, bankAccountApi, shippingApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { FALLBACK_SCALES, FALLBACK_MATERIALS, BRAND_SLUGS, SCALE_SLUGS , MIN_IMAGE_BYTES } from '../_lib/constants';
import type {
  Category,
  Brand,
  CarModel,
  Manufacturer,
  MaterialOption,
  ListingLimits,
  CommissionPreview,
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

  const bankAccountQuery = useQuery({
    queryKey: ['bank-account'],
    queryFn: async () => {
      const res = await bankAccountApi.get();
      return res.data || null;
    },
    enabled: !isEdit,
  });
  const hasBankAccount = isEdit || !!bankAccountQuery.data;

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

  const {
    isAuthenticated,
    isLoading: authLoading,
    user,
    limits,
    refreshUserData,
  } = useAuthStore();

  // İlan listesi/detay ekranlarının bayat kalmaması için ilgili cache'leri temizler.
  const invalidateListingCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-search'] });
    if (productId) queryClient.invalidateQueries({ queryKey: ['product', productId] });
  };

  // #81 (hibrit): text alanları useZodForm'da; watch/setValue köprüsüyle mevcut
  // f.title/f.setTitle sözleşmesi korunur (section'lar değişmez), zod validasyon
  // submit'te form.trigger() ile devreye girer. Diğer alanlar useState kalır.
  const form = useZodForm(listingFormSchema, { defaultValues: emptyListingFormValues });
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

  // Edit-only state
  const status = form.watch('status');
  const setStatus = (v: string) => form.setValue('status', v);
  const isPreorder = form.watch('isPreorder');
  const setIsPreorder = (v: boolean) => form.setValue('isPreorder', v);
  const shippingPackageTier = form.watch('shippingPackageTier');
  const setShippingPackageTier = (v: string) =>
    form.setValue('shippingPackageTier', v);
  const [salePrice, setSalePrice] = useState('');
  const [saleStartDate, setSaleStartDate] = useState('');
  const [saleEndDate, setSaleEndDate] = useState('');
  const [reactivateQuantity, setReactivateQuantity] = useState('');
  const [reactivating, setReactivating] = useState(false);
  const [productLoading, setProductLoading] = useState(isEdit);
  const [productNotFound, setProductNotFound] = useState(false);

  // Images: local URIs for display + server keys for submission
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [imageKeys, setImageKeys] = useState<Array<{ cardKey: string; detailKey: string }>>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Data from API
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<CarModel[]>([]);
  const [scaleList, setScaleList] = useState<string[]>([]);
  const [materialList, setMaterialList] = useState<MaterialOption[]>([]);
  const [manufacturerList, setManufacturerList] = useState<Manufacturer[]>([]);

  // Manufacturer-scoped extra attributes. groupSlug -> selected attribute slugs.
  const [customAttributes, setCustomAttributes] = useState<Record<string, string[]>>({});
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

  // Commission preview
  const [commissionPreview, setCommissionPreview] = useState<CommissionPreview | null>(null);
  const [commissionLoading, setCommissionLoading] = useState(false);

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

  const commissionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setImageKeys(mapped.images.keys);
    setImageUris(mapped.images.uris);
    setSalePrice(mapped.sale.salePrice);
    setSaleStartDate(mapped.sale.saleStartDate);
    setSaleEndDate(mapped.sale.saleEndDate);
    // YALNIZ üretici-kapsamlı nitelikler: `scale`/`material` gibi
    // üretici-bağımsız gruplar formda kendi alanlarına sahip, arayüzde
    // seçilemez ve `attributes[]` payload'ına girerlerse satıcının bilerek
    // yaptığı ölçek/malzeme değişikliğini geri yazarlar.
    const scoped = mapped.manufacturerAttrs;
    setCustomAttributes(scoped);
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
        if (__DEV__) console.error('Failed to fetch manufacturer attribute groups:', error);
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
  // Commission preview when price changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (commissionTimer.current) clearTimeout(commissionTimer.current);

    const amount = Number(price);
    if (isNaN(amount) || amount <= 0) {
      setCommissionPreview(null);
      return;
    }

    commissionTimer.current = setTimeout(() => {
      setCommissionLoading(true);
      api
        .get('/orders/commission-preview', {
          params: {
            amount: price,
            categoryId: categoryId || undefined,
            // Geçilmezse sunucu `small` varsayar → satıcıya HER ZAMAN en küçük
            // paketin net kazancı gösterilirdi. Seçim yoksa alanı hiç koyma.
            packageTier: shippingPackageTier || undefined,
          },
        })
        .then((res) => {
          if (res.data) {
            setCommissionPreview({
              sellerFeeAmount: Number(res.data.sellerFeeAmount ?? 0),
              sellerNetAmount: Number(res.data.sellerNetAmount ?? 0),
            });
          }
        })
        .catch(() => setCommissionPreview(null))
        .finally(() => setCommissionLoading(false));
    }, 500);

    return () => {
      if (commissionTimer.current) clearTimeout(commissionTimer.current);
    };
    // Kademe değişince net kazanç yeniden sorulur — satıcı seçiminin etkisini
    // anında görür.
  }, [price, categoryId, shippingPackageTier]);

  // -----------------------------------------------------------------------
  // API Calls
  // -----------------------------------------------------------------------
  const fetchCategories = async () => {
    try {
      const res = await categoriesApi.getAll();
      const cats = res.data?.data || res.data || [];
      setCategories(cats);
    } catch {
      appAlert(t('common.error'), t('listing.categoriesLoadFailed'));
    }
  };

  const fetchFilters = async () => {
    setBrandsLoading(true);
    try {
      const res = await api.get('/products/filters');
      const data = res.data as {
        scales?: string[];
        materials?: MaterialOption[];
        brands?: Brand[];
        manufacturers?: Manufacturer[];
      };
      if (data.scales?.length) setScaleList(data.scales);
      if (data.materials?.length) setMaterialList(data.materials);
      if (data.brands?.length) setBrands(data.brands);
      if (data.manufacturers?.length) setManufacturerList(data.manufacturers);
    } catch {
      appAlert(t('common.error'), t('listing.filtersLoadFailed'));
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
      appAlert(t('common.error'), t('listing.modelsLoadFailed'));
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
  // Image picker & upload
  // -----------------------------------------------------------------------
  const pickImages = async () => {
    const maxImages = limits?.maxImagesPerListing || 5;
    const remaining = maxImages - imageKeys.length;
    if (remaining <= 0) {
      appAlert(t('listing.imageLimitTitle'), t('product.maxImagesReached'));
      return;
    }

    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      appAlert(t('order.permissionRequired'), t('order.galleryPermissionBody'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    /**
     * 1 KB altı dosyalar elenir — boş/bozuk kayıtlar ve galeri yer tutucuları
     * buradan geliyor.
     *
     * ⚠️ Bu YALNIZCA istemci kuralı: sunucuda alt sınır YOK (`media.service.ts`
     * yalnız 10 MB üst sınırına bakar), yani burada elenen bir dosya teknik
     * olarak yüklenebilirdi. Sınır kalite için; 1 KB altında anlamlı bir ürün
     * fotoğrafı pratikte yok. Web aynı kuralı 2026-08-15'te koydu.
     *
     * `fileSize` her platformda gelmiyor; GELMEYEN dosya elenmez — bilmediğimiz
     * için reddetmek, kullanıcının geçerli fotoğrafını sessizce düşürmek olurdu.
     */
    const picked = result.assets.slice(0, remaining);
    const assets = picked.filter(
      (a) => typeof a.fileSize !== 'number' || a.fileSize >= MIN_IMAGE_BYTES,
    );
    const skipped = picked.length - assets.length;
    if (assets.length === 0) {
      appAlert(t('listing.imageTooSmallTitle'), t('listing.imageAllTooSmall'));
      return;
    }
    if (skipped > 0) {
      appAlert(t('listing.imageTooSmallTitle'), t('listing.imageTooSmallBody', { count: skipped }));
    }
    setUploadingImages(true);

    try {
      const formData = new FormData();
      assets.forEach((asset, idx) => {
        const uri = asset.uri;
        const filename = asset.fileName || `image_${idx}.jpg`;
        const type = asset.mimeType || 'image/jpeg';
        formData.append('images', {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: filename,
          type,
        } as any);
      });

      const res = await api.post('/media/upload/product', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded = Array.isArray(res.data) ? res.data : [res.data];

      const usable = uploaded.filter((r: any) => r?.cardKey && r?.detailKey);
      if (usable.length !== uploaded.length) {
        appAlert('Hata', t('product.imageUploadIncomplete'));
      }
      const newKeys = usable.map((r: any) => ({
        cardKey: r.cardKey,
        detailKey: r.detailKey,
      }));
      const newPreviewUrls = usable.map((r: any) => r.cardUrl || r.detailUrl || '');

      setImageKeys((prev) => [...prev, ...newKeys]);
      // API'nin döndürdüğü URL esastır; yerel geçici URI'yi saklamak, kaydetme
      // anında sunucuda karşılığı olmayan bir görselin "yüklenmiş" görünmesine
      // yol açar (delta 18 §2d).
      setImageUris((prev) => [...prev, ...newPreviewUrls]);
    } catch (err: any) {
      const msg = err.response?.data?.message || t('listing.imageUploadFailed');
      appAlert(t('common.error'), msg);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImageKeys((prev) => prev.filter((_, i) => i !== index));
    setImageUris((prev) => prev.filter((_, i) => i !== index));
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
  const effectiveMaterials = materialList.length > 0 ? materialList : FALLBACK_MATERIALS;
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
    const customAttributeSlugs = Object.values(customAttributes).flat().filter(Boolean);
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
      attributes: customAttributeSlugs.length > 0 ? customAttributeSlugs : undefined,
    } as Record<string, any>;
  };

  /**
   * İndirim alanları — `POST /products` de artık kabul ediyor (delta 18 §2b).
   * `price` formdaki indirim ÖNCESİ normal fiyattır; sunucu
   * `salePrice < max(originalPrice, price)` ise ürünü indirimli açar, aksi
   * halde indirim alanlarını yok sayar. Etkin fiyatı İSTEMCİ TÜRETMEZ.
   */
  const buildSalePayload = (): Record<string, unknown> => {
    const formPrice = Number(price);
    const sale = salePrice ? Number(salePrice) : 0;
    const hasSale = sale > 0 && formPrice > sale && sale !== formPrice;
    if (!hasSale) {
      return {
        originalPrice: null,
        salePrice: null,
        saleStartDate: null,
        saleEndDate: null,
      };
    }
    return {
      originalPrice: formPrice,
      salePrice: sale,
      saleStartDate: saleStartDate ? new Date(saleStartDate).toISOString() : null,
      saleEndDate: saleEndDate ? new Date(saleEndDate).toISOString() : null,
    };
  };

  const validate = (): boolean => {
    // Kurallar ve SIRALARI tek yerde (`_lib/validate.ts`) — kullanıcıya
    // gösterilecek tek mesajı o sıra belirliyor.
    const error = firstListingValidationError(t, {
      values: form.getValues(),
      categoryId,
      imageCount: imageKeys.length,
    });
    if (error) {
      appAlert(t('common.error'), error);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!isEdit && !hasBankAccount) {
      appAlert(
        t('listing.bankAccountRequiredTitle'),
        t('listing.bankAccountRequiredBody'),
        [
          { text: t('listing.dismiss'), style: 'cancel' },
          { text: t('listing.addIban'), onPress: () => router.push('/settings/bank-account') },
        ],
      );
      return;
    }

    if (!isEdit && listingLimits && !listingLimits.canCreateListing) {
      appAlert(
        t('listing.limitExceededTitle'),
        t('listing.limitExceededBody', {
          count: listingLimits.currentCount,
          max: listingLimits.maxListings,
        })
      );
      return;
    }

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

        appAlert(t('common.success'), t('product.listingCreated'), [
          {
            text: t('common.ok'),
            onPress: () => {
              resetForm();
              router.push('/settings/my-listings');
            },
          },
        ]);
        invalidateListingCaches();
        await refreshUserData();
        await updateListingLimits();
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

        appAlert(t('common.success'), t('product.listingUpdated'), [
          { text: t('common.ok'), onPress: () => router.back() },
        ]);
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
        appAlert('Hata', t('product.listingChangedElsewhere'));
        return;
      }

      const msg =
        err.response?.data?.message ??
        err.response?.data?.error ??
        (isEdit ? t('product.updateFailed') : t('product.failedToCreateListing'));
      appAlert(t('common.error'), typeof msg === 'string' ? msg : t('listing.actionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    const qty = Number(reactivateQuantity);
    if (!qty || qty < 1) {
      appAlert(t('common.error'), t('listing.invalidQuantity'));
      return;
    }
    setReactivating(true);
    try {
      await productsApi.update(productId!, { status: 'active', quantity: qty });
      setStatus('pending');
      setQuantity(String(qty));
      invalidateListingCaches();
      appAlert(t('common.success'), t('listing.sentForReview'));
    } catch (err: any) {
      const msg = err.response?.data?.message || t('listing.reactivateFailed');
      appAlert(t('common.error'), msg);
    } finally {
      setReactivating(false);
    }
  };

  const handleDelete = () => {
    appAlert(t('product.deleteListing'), t('listing.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setIsSubmitting(true);
          try {
            await productsApi.delete(productId!);
            invalidateListingCaches();
            await refreshUserData();
            appAlert(t('listing.deletedTitle'), t('listing.deleted'), [
              { text: t('common.ok'), onPress: () => router.back() },
            ]);
          } catch (err: any) {
            const msg = err.response?.data?.message || t('listing.deleteFailed');
            appAlert(t('common.error'), msg);
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

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
    setImageUris([]);
    setImageKeys([]);
    setCommissionPreview(null);
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
    // images
    imageUris,
    imageKeys,
    uploadingImages,
    pickImages,
    removeImage,
    // data
    brands,
    models,
    manufacturerList,
    // custom attrs
    customAttributes, setCustomAttributes,
    manufacturerAttrGroups,
    showAttrGroupPicker, setShowAttrGroupPicker,
    // loading flags
    brandsLoading,
    modelsLoading,
    isSubmitting,
    // commission
    commissionPreview,
    commissionLoading,
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
  };
}

export type ListingFormController = ReturnType<typeof useListingForm>;
