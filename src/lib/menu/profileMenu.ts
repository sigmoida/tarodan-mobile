import type { TFunction } from 'i18next';
import type { IconName } from '@/ui';
import { buildAccountPages } from './accountPages';
import { buildLegalPages } from './legalPages';

/** Sayaç gösterebilen menü satırları — sayaç `useHomeBadges`'den gelir. */
export type ProfileBadgeKey = 'pendingOffers' | 'pendingTrades';

export interface ProfileMenuItem {
  /** Kararlı anahtar (liste key'i). */
  key: string;
  label: string;
  to: string;
  testID?: string;
  badgeKey?: ProfileBadgeKey;
  /** `primary` = marka tonlu etiket (işletme paneli). */
  tone?: 'default' | 'primary';
  /** Satırın sağında metin rozeti (ör. üyelik katmanı). */
  rightBadge?: string;
  /** Satırın sol ikonu (outline); verilmezse `MENU_ICONS`'tan satır anahtarına göre atanır. */
  icon?: IconName;
  /** Yalnız üyeye görünür (misafire açık bir grubun içinde bile). */
  authOnly?: boolean;
}

/**
 * Menünün çizildiği yüzey: Profil sekmesi (kullanıcının işlemleri / aktivitesi) ya da Ayarlar
 * ekranı (`/settings`: hesap, ödeme ayarları, üyelik, tercihler, destek, bilgi/yasal + çıkış).
 */
export type ProfileMenuSurface = 'profile' | 'settings';

export interface ProfileMenuGroup {
  key: string;
  /** Grup başlığı (web `ProfileSidebar` grupları `profile.sidebar.*`; mobil-özel gruplar `mobile.*`). */
  title: string;
  /** Grubun gösterildiği yüzey — her grup TEK yüzeyde (profil ile ayarlar ayrışık). */
  surface: ProfileMenuSurface;
  /** Misafire de gösterilir (Ayarlar'da: dil, yardım, bilgi/yasal). */
  guest?: boolean;
  /** Wide windows (two menu columns): the card spans both columns, below them. */
  fullWidth?: boolean;
  items: ProfileMenuItem[];
}

export interface ProfileMenuContext {
  /** Kurumsal hesap (companyName + taxId var). */
  isBusiness: boolean;
  /**
   * Üyelik satırı (plan + abonelik durumu tek ekranda, `/membership`): satın alma açık platform
   * ya da ücretli üye. iOS'ta ücretsiz kullanıcı görmez (Apple 2.1(b)). Mobilde salt görüntüleme.
   */
  showMembership: boolean;
  /** Efektif üyelik `business` mı (işletme paneli satırı). */
  isBusinessTier: boolean;
}

/** Bağlam gerektirmeyen kullanım (misafir) için nötr bağlam: koşullu satırlar gizli. */
export const DEFAULT_MENU_CONTEXT: ProfileMenuContext = {
  isBusiness: false,
  showMembership: false,
  isBusinessTier: false,
};

/** Tanımsız satır anahtarının ikonu. */
export const DEFAULT_MENU_ICON: IconName = 'document-text';

/** Satır ikonları — satır anahtarına göre TEK harita (Profil ve Ayarlar aynı satır görünümü). */
const MENU_ICONS: Record<string, IconName> = {
  // Alışveriş
  business: 'building-storefront',
  listings: 'tag',
  orders: 'shopping-bag',
  sales: 'truck',
  trades: 'arrows-right-left',
  offers: 'paper-airplane',
  discounts: 'receipt-percent',
  // Finans
  payments: 'banknotes',
  'payment-history': 'clock',
  refunds: 'arrow-uturn-left',
  // Koleksiyon
  collections: 'rectangle-stack',
  'liked-collections': 'star',
  'account-following': 'user-group',
  'saved-searches': 'magnifying-glass',
  // Analiz
  analytics: 'chart-bar',
  // Ayarlar · Hesap
  'edit-profile': 'user-circle',
  addresses: 'map-pin',
  security: 'lock-closed',
  blocked: 'no-symbol',
  // Ayarlar · Ödeme
  'bank-account': 'building-library',
  'payment-methods': 'credit-card',
  // Ayarlar · Üyelik
  membership: 'sparkles',
  'business-application': 'briefcase',
  // Ayarlar · Tercihler
  'notification-settings': 'bell',
  'account-newsletter': 'envelope',
  language: 'language',
  // Ayarlar · Yardım & Destek
  support: 'lifebuoy',
  help: 'question-mark-circle',
  // Bilgi & Yasal (`legal-<doc>`): her belge ayırt edilebilir kendi ikonuyla.
  'legal-terms': 'document-text',
  'legal-privacy': 'shield-check',
  'legal-distance-sales': 'clipboard-document-check',
  'legal-cookies': 'finger-print',
  'legal-seller-agreement': 'building-storefront',
  'legal-refund-policy': 'receipt-refund',
};

export function menuIconFor(key: string): IconName {
  return MENU_ICONS[key] ?? DEFAULT_MENU_ICON;
}

const withIcons = (items: ProfileMenuItem[]): ProfileMenuItem[] =>
  items.map((i) => ({ ...i, icon: i.icon ?? menuIconFor(i.key) }));

/**
 * Menü modeli — TEK kaynak. Web `ProfileSidebar`'ın gruplu yapısı, iki yüzeye bölünmüş:
 * - `profile` (Profil sekmesi = kullanıcının yaptıkları): Alışveriş · Finans · Koleksiyon · Analiz.
 * - `settings` (Ayarlar ekranı = hesap ve uygulama nasıl çalışıyor): Hesap · Ödeme ayarları ·
 *   Üyelik · Tercihler · Yardım & Destek · Bilgi & Yasal (+ ekranda en altta çıkış).
 * Seçiciler: `selectProfileSections`, `selectSettingsSections`. Etiketler web'in i18n anahtarlarıdır;
 * web'de karşılığı olmayan mobil ekranlar (banka hesabı, ödeme geçmişi, dil…) ilgili gruba eklenir.
 * Her satır `icon` taşır (`MENU_ICONS`).
 *
 * Fabrika: etiketler çeviriden geldiği için modül düzeyinde kurulmaz (dil değişince yenilenir).
 */
export function buildProfileMenuGroups(
  t: TFunction,
  ctx: ProfileMenuContext = DEFAULT_MENU_CONTEXT,
): ProfileMenuGroup[] {
  const accountPages = buildAccountPages(t);
  /** Hesap sayfası satırı (testID `profile-account-<route>-link`); `label` verilirse etiketi ezer. */
  const accountItem = (route: string, label?: string): ProfileMenuItem[] => {
    const page = accountPages.find((p) => p.route === route);
    return page
      ? [
          {
            key: `account-${route}`,
            label: label ?? page.label,
            to: `/${route}`,
            testID: `profile-account-${route}-link`,
          },
        ]
      : [];
  };
  const groups: ProfileMenuGroup[] = [
    {
      key: 'commerce',
      title: t('profile.sidebar.alisveris'),
      surface: 'profile',
      items: [
        // İşletme paneli bir çalışma alanı (ayar değil): yalnız işletme üyeliğinde, grubun başında.
        ...(ctx.isBusinessTier
          ? [
              {
                key: 'business',
                label: t('mobile.settingsBusinessPanel'),
                to: '/settings/business',
                tone: 'primary' as const,
              },
            ]
          : []),
        { key: 'listings', label: t('nav.myListings'), to: '/settings/my-listings' },
        { key: 'orders', label: t('order.myOrders'), to: '/orders', testID: 'profile-orders-link' },
        { key: 'sales', label: t('mobile.quickMySales'), to: '/sales', testID: 'profile-sales-link' },
        {
          key: 'trades',
          label: t('trade.myTrades'),
          to: '/trades',
          testID: 'profile-trades-link',
          badgeKey: 'pendingTrades',
        },
        {
          key: 'offers',
          label: t('offer.myOffers'),
          to: '/offers',
          testID: 'profile-offers-link',
          badgeKey: 'pendingOffers',
        },
        {
          key: 'discounts',
          label: t('profile.sidebar.indirimlerim'),
          to: '/settings/discounts',
          testID: 'profile-discounts-link',
        },
      ],
    },
    {
      key: 'finance',
      title: t('profile.sidebar.finans'),
      surface: 'profile',
      items: [
        {
          key: 'payments',
          label: t('profile.sidebar.odemelerim'),
          to: '/settings/payments',
          testID: 'profile-payments-link',
        },
        {
          key: 'payment-history',
          label: t('mobile.settingsPaymentHistory'),
          to: '/settings/payment-history',
          testID: 'profile-payment-history-link',
        },
        {
          key: 'refunds',
          label: t('profile.sidebar.iadeTalepleri'),
          to: '/refund-requests',
          testID: 'profile-refunds-link',
        },
      ],
    },
    {
      key: 'collection',
      title: t('profile.sidebar.koleksiyon'),
      surface: 'profile',
      items: [
        { key: 'collections', label: t('collection.myCollections'), to: '/settings/collections' },
        {
          key: 'liked-collections',
          label: t('collection.likedCollections'),
          to: '/settings/liked-collections',
        },
        // Web etiketi; satır `buildAccountPages` listesinden gelir (testID sözleşmesi).
        ...accountItem('following', t('profile.sidebar.takipEttiklerim')),
        {
          key: 'saved-searches',
          label: t('profile.sidebar.kayitliAramalar'),
          to: '/settings/saved-searches',
          testID: 'profile-saved-searches-link',
        },
      ],
    },
    {
      key: 'insights',
      title: t('profile.sidebar.analiz'),
      surface: 'profile',
      items: [
        { key: 'analytics', label: t('profile.sidebar.istatistikler'), to: '/settings/analytics' },
      ],
    },
    {
      key: 'account',
      title: t('profile.sidebar.hesap'),
      surface: 'settings',
      items: [
        {
          key: 'edit-profile',
          label: t('profile.editProfile'),
          to: '/settings/edit-profile',
          testID: 'settings-edit-profile-link',
        },
        { key: 'addresses', label: t('mobile.settingsAddresses'), to: '/settings/addresses' },
        { key: 'security', label: t('profile.sidebar.guvenlik'), to: '/settings/security' },
        {
          key: 'blocked',
          label: t('profile.sidebar.engellenenler'),
          to: '/settings/blocked-users',
          testID: 'profile-blocked-users-link',
        },
      ],
    },
    {
      key: 'payment-settings',
      title: t('mobile.settingsGroupPayment'),
      surface: 'settings',
      items: [
        { key: 'bank-account', label: t('mobile.settingsBankAccount'), to: '/settings/bank-account' },
        {
          key: 'payment-methods',
          label: t('profile.sidebar.odemeYontemleri'),
          to: '/settings/payment-methods',
          testID: 'profile-payment-methods-link',
        },
      ],
    },
    {
      key: 'membership',
      title: t('nav.membership'),
      surface: 'settings',
      // Satırların ikisi de koşullu; boş kalırsa grup seçicide düşer.
      items: [
        ...(ctx.showMembership
          ? [
              {
                key: 'membership',
                label: t('mobile.settingsMembershipPlan'),
                to: '/membership',
                testID: 'profile-membership-link',
              },
            ]
          : []),
        ...(ctx.isBusiness
          ? [
              {
                key: 'business-application',
                label: t('mobile.quickBusinessApplication'),
                to: '/settings/business-application',
                testID: 'settings-business-application',
              },
            ]
          : []),
      ],
    },
    {
      key: 'preferences',
      title: t('mobile.settingsGroupPreferences'),
      surface: 'settings',
      guest: true,
      items: [
        {
          key: 'notification-settings',
          label: t('mobile.settingsNotifications'),
          to: '/settings/notifications',
          authOnly: true,
        },
        ...accountItem('newsletter').map((i) => ({ ...i, authOnly: true })),
        {
          key: 'language',
          label: t('mobile.settingsLanguage'),
          to: '/settings/language',
          testID: 'profile-language-link',
        },
      ],
    },
    {
      key: 'support',
      title: t('footer.helpSupport'),
      surface: 'settings',
      guest: true,
      // Mesajlar ve Bildirimler üst bar / yığın rotaları — burada tekrarlanmaz.
      items: [
        { key: 'support', label: t('mobile.settingsSupportTickets'), to: '/support', authOnly: true },
        { key: 'help', label: t('mobile.settingsHelpFaq'), to: '/help' },
      ],
    },
    {
      key: 'info',
      fullWidth: true,
      title: t('mobile.menuInfoLegal'),
      surface: 'settings',
      guest: true,
      items: buildLegalPages(t).map((p) => ({
        key: `legal-${p.doc}`,
        label: p.label,
        to: p.route as string,
        testID: `profile-legal-${p.doc}-link`,
      })),
    },
  ];
  return groups.map((g) => ({ ...g, items: withIcons(g.items) }));
}


/** Profil sekmesinde gösterilecek gruplar (kullanıcının işlemleri); satırı kalmayan grup düşer. */
export function selectProfileSections(groups: ProfileMenuGroup[]): ProfileMenuGroup[] {
  return groups.filter((g) => g.surface === 'profile' && g.items.length > 0);
}

/**
 * Ayarlar ekranında gösterilecek gruplar. Misafirde yalnız `guest` işaretli gruplar ve içlerinden
 * `authOnly` olmayan satırlar kalır (dil, yardım, bilgi/yasal); satırı kalmayan grup düşer.
 */
export function selectSettingsSections(
  groups: ProfileMenuGroup[],
  opts: { isGuest: boolean },
): ProfileMenuGroup[] {
  const settings = groups.filter((g) => g.surface === 'settings');
  const visible = opts.isGuest
    ? settings.filter((g) => g.guest).map((g) => ({ ...g, items: g.items.filter((i) => !i.authOnly) }))
    : settings;
  return visible.filter((g) => g.items.length > 0);
}
