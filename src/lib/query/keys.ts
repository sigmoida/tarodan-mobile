/**
 * Merkezi query key registry — TanStack Query anahtarlarının TEK kaynağı.
 *
 * Neden: 189 inline useQuery ekranlar arası anahtarları elle yazıyordu
 * (`['my-collections']` vs `['myCollections']`, `['collections']` vs
 * `['collection', id]` gibi sessiz drift'ler). Merkezî factory ile:
 *   - anahtarlar tutarlı ve tip-güvenli üretilir,
 *   - mutation hook'ları `invalidateQueries({ queryKey: qk.products.all })`
 *     ile bir domain'in tüm alt-anahtarlarını hiyerarşik geçersiz kılar.
 *
 * Konvansiyon (web `lib/queryClient` ergonomisinin mobil karşılığı):
 *   qk.<domain>.all                 → domain kökü (liste invalidasyonu için)
 *   qk.<domain>.list(filters?)      → filtreli/aramalı liste
 *   qk.<domain>.detail(id)          → tekil kayıt
 *
 * Yeni domain eklerken: aşağıya bir factory nesnesi ekle, `as const` bırak.
 * Ekranlar Faz 1'de inline anahtarlarını bu registry'ye bağlar.
 */

type Filters = Record<string, unknown> | undefined;

export const qk = {
  auth: {
    corporateInvitation: (token: string) => ['auth', 'corporate-invitation', token] as const,
    /** Kayıt sırasında debounce edilmiş kullanıcı adı uygunluğu sorgusu. */
    usernameAvailability: (username: string) => ['auth', 'username-availability', username] as const,
    /** Ban ekranı: hesap banlı mı + sunucudaki ban nedeni (URL'den OKUNMAZ). */
    banStatus: ['auth', 'ban-status'] as const,
    /** GET /auth/sign-in-methods: password flag + linked providers (never persisted). */
    signInMethods: ['auth', 'sign-in-methods'] as const,
  },

  consents: {
    /** GET /consents/me/pending — yeniden-onay kapısı (zorunlu adımlar). */
    pending: ['consents', 'me', 'pending'] as const,
  },

  legalIdentity: {
    /** GET /legal-identity/me — ihtiyaç anında kimlik kapısı + profildeki salt-okunur bölüm. */
    me: ['legal-identity', 'me'] as const,
  },

  products: {
    all: ["products"] as const,
    list: (filters?: Filters) => ["products", "list", filters] as const,
    search: (query?: string, filters?: Filters) =>
      ["products-search", query, filters] as const,
    detail: (id: string) => ["product", id] as const,
    /** Prefix root — TEKİL `product` detayları. `all` (`["products"]`) bunları
     *  YAKALAMAZ; çapraz invalidasyonlarda ikisi birden verilmeli. */
    detailAll: ["product"] as const,
    reviews: (id: string) => ["product-reviews", id] as const,
    /** Ürün değerlendirmeleri ekranı: sayfalı liste + puan özeti. */
    reviewsAll: (id: string) => ["product-reviews-all", id] as const,
    ratingStats: (id: string) => ["product-rating-stats", id] as const,
    /** Prefix root'lar — her ürünün yorum / yorum ekranı / puan sorgularını yakalar (engelleme). */
    reviewsRoot: ["product-reviews"] as const,
    reviewsAllRoot: ["product-reviews-all"] as const,
    ratingStatsRoot: ["product-rating-stats"] as const,
    /** Yeni mesaj ekranının ürün özeti (`GET /products/:id` ham gövde). Tekil `product` kökünün
     *  altında (`detail(id)` invalidasyonu bunu da tazeler) ama detayla şekil paylaşmaz. */
    composeSummary: (id: string) => ["product", id, "compose"] as const,
    /** Filtre seçenekleri (`/products/filters`, opsiyonel üretici slug'ı). */
    filterOptions: (manufacturerSlug: string) => ["product-filters", manufacturerSlug] as const,
    /** Tüm filtre seçenekleri önbellekleri (kalıcı önbellek izin listesi). */
    filterOptionsAll: ["product-filters"] as const,
    /** Arama önerileri (ürün/kategori/marka) ve satıcı önerileri + engelleme için kökleri. */
    autocomplete: (q: string) => ["autocomplete-rich", q] as const,
    autocompleteAll: ["autocomplete-rich"] as const,
    autocompleteSellers: (q: string) => ["autocomplete-sellers", q] as const,
    autocompleteSellersAll: ["autocomplete-sellers"] as const,
    /** Ürün detayı "Benzer Ürünler". */
    similar: (id: string, limit?: number) => ["product", id, "similar", limit] as const,
    /** "Ürün artık satışta değil" ekranının ürünü (404/pasif ilan da dönebilir). */
    unavailable: (id: string) => ["product-unavailable", id] as const,
    /** Liste ekranlarının (home/arama/öne-çıkanlar) prefix root'ları — beğeni/
     * görüntülenme değişince hepsi tazelensin diye tek yerde. */
    searchAll: ["products-search"] as const,
    boosted: ["products", "boosted"] as const,
    /** Anasayfa rayları (web ile aynı üç uç): Öne Çıkan (homeShowcase), İndirimdekiler, Takas Vitrini. */
    homeFeatured: ["products", "home", "featured"] as const,
    homeOnSale: ["products", "home", "on-sale"] as const,
    homeTrade: ["products", "home", "trade"] as const,
    /** Anasayfa "Popüler İlanlar" — backend görüntülenmeye göre sıralar. */
    popular: ["products", "popular"] as const,
    /** İlana özel boost paket seçenekleri (paket + süre + fiyat). */
    boostOptions: (id: string) => ["product", id, "boost-options"] as const,
    featuredBusiness: ["featured-business"] as const,
    featuredCollector: ["featured-collector"] as const,
    myListings: (filters?: Filters | string) =>
      ["my-listings", filters] as const,
    myListingsStats: ["my-listings-stats"] as const,
    /**
     * İlan formunun kota kartı (`GET /products/my/stats` → `ListingLimits`). `myListingsStats`
     * kökünün altında: ilan yazımlarının invalidasyonu (`listingCacheKeys`) bunu da tazeler.
     * Şekil İlanlarım sayaçlarından farklı olduğu için AYRI anahtar; `tier` (üyelik imzası)
     * değişince yeniden sorulur.
     */
    myListingQuota: (tier: string) => ["my-listings-stats", "listing-quota", tier] as const,
    /** İlanlarım "Süresi dolan" sayacı (`limit=1` + `meta.total`). `my-listings` kökünün altında → `myListingsAll` ile tazelenir. */
    myListingsExpiredCount: ["my-listings", "expired-count"] as const,
    /** Satıcı paneli "Aktif ilan" sayacı — `my-listings` kökünün altında. */
    myListingsActiveCount: ["my-listings", "active-count"] as const,
    /** Koleksiyona ürün ekleme listesi (yalnız active/sold). `myListings('all')` ile ÇAKIŞMASIN
     *  diye ayrı yaprak (o sekme filtresiz tüm listeyi tutar). */
    myListingsForCollection: ["my-listings", "collection-picker"] as const,
    myFeatured: ["my-featured-listings"] as const,
    /** Kategori ekranı ürünleri (arama + sıralama + ölçek). */
    categoryProducts: (categoryId?: string, search?: string, sortBy?: string, scale?: string) =>
      ["category-products", categoryId, search, sortBy, scale] as const,
    /** Prefix root — her kategori ürün listesini yakalar. */
    categoryProductsAll: ["category-products"] as const,
    /** Prefix roots for invalidation (match every filtered variant). */
    myListingsAll: ["my-listings"] as const,
    /** İlan formu: `/products/attribute-groups` (genel özel gruplar, ör. Nadirlik). */
    attributeGroups: ["listing-form-attr-groups"] as const,
  },

  shipping: {
    /** Prefix root — tüm kargo sorguları. */
    all: ["shipping"] as const,
    /** Kargo paket kademesi tarifesi (public) — ilan formundaki üç kart. */
    packageTiers: ["shipping", "package-tiers"] as const,
    /** Siparişin kargo kaydı. 404 = kargo yok (hata değil). */
    byOrder: (orderId: string) => ["shipping", "order", orderId] as const,
  },

  catalog: {
    categories: ["categories"] as const,
    /** Koleksiyon tarama kategori filtresi — `/categories?refresh=1` ağacı (web `categories.collections`). */
    collectionCategories: ["categories", "collections"] as const,
    brands: ["brands"] as const,
    manufacturers: ["manufacturers"] as const,
    /** Marka / üretici detayı (slug) ve ürünleri (varlık id'si). */
    brand: (slug: string) => ["brand", slug] as const,
    brandProducts: (id?: string) => ["brand-products", id] as const,
    /** Prefix root'lar — her marka / üretici / model ürün listesini yakalar (engelleme). */
    brandProductsAll: ["brand-products"] as const,
    manufacturerProductsAll: ["manufacturer-products"] as const,
    modelProductsAll: ["model-products"] as const,
    /** Kategori detayı (slug). */
    category: (slug: string) => ["category", slug] as const,
    manufacturer: (slug: string) => ["manufacturer", slug] as const,
    manufacturerProducts: (id?: string) => ["manufacturer-products", id] as const,
    /** Model detayı (slug) ve o modele ait ürünler. */
    carModel: (slug: string) => ["car-model", slug] as const,
    modelProducts: (slug: string) => ["model-products", slug] as const,
    carModels: (filters?: Filters) => ["car-models", filters] as const,
    /** Prefix root — tüm model listeleri (filtreli/filtresiz). */
    carModelsAll: ["car-models"] as const,
  },

  collections: {
    all: ["collections"] as const,
    /** Herkese açık koleksiyon tarama (sonsuz liste) — `{ sortBy, search, categoryId }`. */
    list: (filters?: Filters) => ["collections", "list", filters] as const,
    detail: (id: string) => ["collection", id] as const,
    /** Prefix root — her `collection` detayını yakalar. */
    detailAll: ["collection"] as const,
    browse: ["collections", "browse"] as const,
    /** Anasayfa "En İyi Koleksiyonlar" — `/users/top-collections`. */
    top: ["collections", "top"] as const,
    mine: ["my-collections"] as const,
    liked: ["liked-collections"] as const,
    /** Ürün ekleme ekranı: koleksiyondaki productId → itemId haritası. */
    picker: (collectionId: string) => ["collection-picker", collectionId] as const,
    profile: (userId: string) => ["profile-collections", userId] as const,
  },

  orders: {
    all: ["orders"] as const,
    list: (filters?: Filters) => ["orders", "list", filters] as const,
    detail: (id: string) => ["order", id] as const,
    /** Siparişin TÜM e-Arşiv belgeleri (`/elogo/invoices/by-order/:id/all`). */
    elogoInvoices: (id: string) => ["elogo-invoices", id] as const,
    sellerInvoice: (id: string) => ["seller-invoice", id] as const,
    /** Satıcı (Satışlarım) sorguları — hepsi `orders` kökünün altında: `qk.orders.all`
     *  invalidasyonu (satış aksiyonları, iptal…) liste, kazanç, sayaç ve detayı birlikte tazeler. */
    sellerAll: ["orders", "seller"] as const,
    sellerList: (filter: string) => ["orders", "seller", "list", filter] as const,
    sellerEarnings: ["orders", "seller", "earnings"] as const,
    /** Satıcı paneli: kargo bekleyen (paid) sipariş sayısı. */
    sellerPending: ["orders", "seller", "pending-count"] as const,
    /** Satış detayı (satıcı gözü). Alıcı `detail(id)` ile şekil paylaşmadığı için ayrı yaprak. */
    saleDetail: (id: string) => ["orders", "sale", id] as const,
    /** Çok satıcılı sepet grubu. */
    group: (id: string) => ["orders", "group", id] as const,
    /** İlan formu: tek ürün komisyon/hak ediş önizlemesi (`GET /orders/commission-preview`). */
    commissionPreview: (amount: string, categoryId: string, packageTier: string | null) =>
      ["orders", "commission-preview", amount, categoryId, packageTier] as const,
  },

  trades: {
    all: ["trades"] as const,
    list: (filters?: Filters) => ["trades", "list", filters] as const,
    detail: (id: string) => ["trade", id] as const,
    /** Prefix root — TEKİL `trade` detayları (`all` = `["trades"]` bunları YAKALAMAZ). */
    detailAll: ["trade"] as const,
    /** Takas ödeme dökümü (v2 fiyatlama) — v1 takasta boş gövde döner. */
    paymentQuote: (id: string) => ["trade", id, "payment-quote"] as const,
    /** Kaydedilmemiş teklifin canlı fiyatı — teklif oluşturma ekranı. */
    previewQuote: (mine: unknown, theirs: unknown, cash: number, payer: string) =>
      ["trade", "preview-quote", mine, theirs, cash, payer] as const,
    /** Takaslarım segment sayaçları — `trades` kökünün ALTINDA: takas aksiyonlarının
     *  `qk.trades.all` invalidasyonu sayaçları da tazeler. */
    statusCounts: ["trades", "status-counts"] as const,
    /** status-counts'ta olmayan tek durum sayacı (İptal / Reddedilen; `pageSize=1` + total). */
    statusCountBy: (status: string) => ["trades", "status-counts", status] as const,
    /** Profil menüsü rozeti: yanıt bekleyen takas sayısı. */
    pendingCount: ["trades", "pending-count"] as const,
    targetListing: (id: string) => ["trade-target-listing", id] as const,
    /**
     * Prefix root: every variant of the user's tradeable listings (the paged pickers, which
     * are infinite queries under it). A listing change invalidates the whole prefix.
     */
    myTradeableAll: ["my-tradeable-products"] as const,
    /** New trade, my side: the target listing is excluded, so it is part of the key. */
    myTradeable: (userId: string | undefined, excludeListingId?: string) =>
      ["my-tradeable-products", userId, "new", excludeListingId ?? null] as const,
    /** Counter offer, my side (a different endpoint filter, so its own leaf). */
    myTradeableForCounter: (userId: string | undefined) =>
      ["my-tradeable-products", userId, "counter"] as const,
    sellerTradeableAll: ["seller-tradeable-products"] as const,
    /**
     * New trade, their side. The public list depends on the viewer (blocked sellers are
     * hidden), so the key carries the user id like every other picker key.
     */
    sellerTradeable: (userId: string | undefined, sellerId: string) =>
      ["seller-tradeable-products", userId, sellerId, "new"] as const,
    /** Counter offer, their side (its own leaf, same reason as `sellerTradeable`). */
    sellerTradeableForCounter: (userId: string | undefined, sellerId: string | undefined) =>
      ["seller-tradeable-products", userId, sellerId, "counter"] as const,
  },

  offers: {
    all: ["offers"] as const,
    list: (type?: string) => ["offers", "list", type] as const,
    detail: (id: string) => ["offer", id] as const,
    /** Prefix root — TEKİL `offer` detayları (`all` = `["offers"]` bunları YAKALAMAZ). */
    detailAll: ["offer"] as const,
    /** Batch komisyon önizlemesi — teklif id kümesine göre anahtarlı. */
    commissionPreview: (ids: string[]) =>
      ["offers", "commission-preview", ids] as const,
    /** Profil menüsü rozeti: yanıt bekleyen (gelen) teklif sayısı. */
    pendingCount: ["offers", "pending-count"] as const,
  },

  membership: {
    /** TEK kök — iptal/değişim/yenileme `all` ile profil rozeti, yönetim ekranı, katmanlar ve
     *  limitler (`membershipLimits.mine`) birlikte tazelenir. */
    all: ["membership"] as const,
    /** Üyelik katmanları + fiyatları (checkout ekranı). */
    tiers: ["membership", "tiers"] as const,
    /** Profil rozeti: `/membership/me`'den yalnız efektif tier (string). */
    me: ["membership", "me", "tier"] as const,
    /** Üyelik yönetimi: `/membership/me` tam gövde. `me` (tier string) ile şekil paylaşmaz. */
    current: ["membership", "me", "full"] as const,
    discounts: ["my-discounts"] as const,
    discountProducts: ["my-products-for-discount"] as const,
    eligibleForFeatured: ["eligible-for-featured"] as const,
  },

  payments: {
    /** Prefix kök — ödemelerim sorgularının hepsi (liste + geçmiş). */
    mine: ["my-payments"] as const,
    /** Ödemelerim (durum filtresiyle; boş = tümü). */
    list: (status: string) => ["my-payments", "list", status] as const,
    /** Ödeme geçmişi ekranı (ekran modeline çevrilmiş satırlar — `list` ile şekil paylaşmaz). */
    history: ["my-payments", "history"] as const,
    /** Prefix kök — kart silinince her amacın listesi birlikte tazelenir. */
    savedCardsAll: ["saved-cards"] as const,
    /**
     * Kayıtlı kartlar, PayTR mağazasına (amaç) göre: `checkout` / `membership`;
     * amaçsız = iki mağaza birlikte (Kayıtlı Kartlarım).
     */
    savedCards: (purpose?: string) => ["saved-cards", purpose ?? "all"] as const,
  },

  user: {
    /** İşletme paneli istatistikleri (yalnız kurumsal hesap). */
    businessStats: ["business-stats"] as const,
    /** 2FA açık mı — kaynak TwoFactorSecret.isEnabled, user nesnesinde yok. */
    twoFactorStatus: ["two-factor-status"] as const,
    /** Prefix root — `user` altındaki her sorgu (hesap alanı değişince). */
    all: ["user"] as const,
    detail: (id: string) => ["user", id] as const,
    /** Kendi analitiğim (`/users/me/analytics`, dönem). */
    analytics: (period: string) => ["analytics", period] as const,
    stats: (id?: string) => ["user-stats", id] as const,
    /** Prefix root — invalidate every user-stats variant (with/without id). */
    statsAll: ["user-stats"] as const,
    /** Kendi özet istatistikleri — GET /users/me/stats. */
    summaryStats: ["user-stats", "me", "summary"] as const,
    /**
     * Tam profil doğrulaması (`useFullProfile` — `refreshUserData`'yı tetikler; veri store'da).
     * `user` önekinin DIŞINDA: `qk.user.all` geçersizlemesi her hesap değişiminde yeniden çekmesin.
     */
    fullProfile: (userId?: string) => ["full-profile", userId] as const,
    bankAccount: ["bank-account"] as const,
    addresses: ["addresses"] as const,
    notificationSettings: ["notification-settings"] as const,
    savedSearches: ["saved-searches"] as const,
  },

  blocks: {
    /** Engellediğim kullanıcılar (Profil → Engellenen Kullanıcılar). */
    list: ["blocked-users"] as const,
    /** Hedefi engelledim mi? (menüde Engelle / Engeli Kaldır). */
    status: (id: string) => ["block-status", id] as const,
    statusAll: ["block-status"] as const,
  },

  seller: {
    /** Prefix root'lar — engelleme gibi çapraz invalidasyonlarda her varyantı yakalar. */
    all: ["seller"] as const,
    productsAll: ["seller-products"] as const,
    collectionsAll: ["seller-collections"] as const,
    detail: (id: string) => ["seller", id] as const,
    stats: (id: string) => ["seller-stats", id] as const,
    products: (id: string) => ["seller-products", id] as const,
    ratings: (id: string) => ["seller-ratings", id] as const,
    ratingsAll: ["seller-ratings"] as const,
    /** Satıcı paneli istatistik birleşimi. `stats(id)` (herkese açık profil) ile ÇAKIŞMASIN. */
    dashboardStats: (isBusiness: boolean) => ["seller-dashboard", "stats", isBusiness] as const,
    ratingStats: (id: string) => ["seller-rating-stats", id] as const,
    collections: (id: string) => ["seller-collections", id] as const,
  },

  messaging: {
    /** Prefix root — invalidate every messaging query at once. */
    all: ["messaging"] as const,
    threads: ["messaging", "threads"] as const,
    thread: (id: string) => ["messaging", "thread", id] as const,
    messages: (threadId: string) =>
      ["messaging", "messages", threadId] as const,
    unreadCount: ["messaging", "unread-count"] as const,
    /** GET /messages/daily-limit — `{ remaining, limit }` (tek platform ayarı). */
    dailyLimit: ["messaging", "daily-limit"] as const,
  },

  notifications: {
    unread: ["notifications-unread"] as const,
    /** Bildirim listesi + okunmamış sayısı (tek sorgu, ikisi birlikte gelir). */
    list: ["notifications", "list"] as const,
  },

  favorites: {
    all: ["favorites"] as const,
  },

  follow: {
    following: ["following"] as const,
  },

  subscription: {
    current: ["subscription-current"] as const,
    billing: ["billing-history"] as const,
  },

  addresses: {
    mine: ["my-addresses"] as const,
  },

  checkout: {
    /** `couponCode` anahtara dahildir — kupon değişince (uygulanınca/kaldırılınca)
     *  quote tazelenmeli, aksi halde sunucu indirimi hesaba katmadan eski toplamı
     *  gösteririz. */
    quote: (sig: string, couponCode?: string) =>
      ["checkout-quote", sig, couponCode ?? null] as const,
  },

  support: {
    tickets: ["support-tickets"] as const,
    /** Kullanıcının talep listesi (`tickets` önekinin altında — `tickets` invalidate'i bunu da yeniler). */
    mine: ["support-tickets", "me"] as const,
    detail: (id?: string) => ["support-tickets", "detail", id] as const,
  },

  refunds: {
    all: ["refund-requests"] as const,
    /** İade talepleri sekmesi: `buyer` (benim taleplerim) / `seller` (bana gelenler). */
    list: (tab: string) => ["refund-requests", "list", tab] as const,
    detail: (id: string) => ["refund-requests", "detail", id] as const,
  },

  featured: {
    business: ["featured-business"] as const,
    collector: ["featured-collector"] as const,
  },

  cart: {
    /** Sunucu sepeti (yalnız üye) — satırlar + fiyat hesabı. */
    mine: ["cart"] as const,
  },

  ads: {
    /** Yayındaki bannerlar — konum/cihaz filtresi istemcide yapılır. */
    active: ["ads", "active"] as const,
  },

  hero: {
    /**
     * GET /hero-slides?placement=&platform= — admin'den yönetilen vitrin slaytları.
     * Platform anahtarda: parametresiz eski istek önbelleği yenisiyle karışmasın.
     */
    slides: (placement: string, platform: string) => ["hero", "slides", placement, platform] as const,
    /** Bir yerleşimin tüm slayt önbellekleri (platformdan bağımsız önek). */
    slidesOf: (placement: string) => ["hero", "slides", placement] as const,
    /** Tüm slayt önbellekleri (önek). Kalıcı önbellekte yalnız auth yerleşimleri var — bkz. `persist.ts`. */
    slidesAll: ["hero", "slides"] as const,
  },

  membershipLimits: {
    /** GET /membership/me/limits — reklamsız üyelik kontrolü için. */
    mine: ["membership", "limits"] as const,
  },

  appConfig: {
    all: ["app-config"] as const,
    check: (platform: string, version: string) =>
      ["app-config", platform, version] as const,
  },

  sellerDocuments: {
    list: ["seller-documents"] as const,
    application: ["seller-documents", "application"] as const,
  },

  timingPolicy: {
    /** GET /timing-rules — admin'den yönetilen herkese açık politika süreleri. */
    all: ["timing-policy"] as const,
  },

  publicSettings: {
    /** GET /admin/settings/public — admin'in herkese açık sayısal ayarları (ilan fiyat sınırları…). */
    all: ["public-settings"] as const,
  },
} as const;
