import type { TFunction } from 'i18next';
import { buildAccountPages, buildInfoPages } from './infoPages';
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
}

export interface ProfileMenuGroup {
  key: string;
  /** Web ProfileSidebar grup başlığı (`profile.sidebar.*`). */
  title: string;
  items: ProfileMenuItem[];
}

export interface ProfileMenuContext {
  /** Kurumsal hesap (companyName + taxId var). */
  isBusiness: boolean;
  /**
   * Üyelik/abonelik satırları: satın alma açık platform ya da ücretli üye. iOS'ta ücretsiz
   * kullanıcı görmez (Apple 2.1(b)); ücretli üye aboneliğini iptal edebileceği tek yer.
   */
  showMembership: boolean;
  isPaidTier: boolean;
  tierLabel: string;
  /** Efektif üyelik `business` mı (işletme paneli satırı). */
  isBusinessTier: boolean;
}

/**
 * Profil menüsü — web `ProfileSidebar`'ın gruplu yapısı (Alışveriş · Finans · Koleksiyon ·
 * Analiz · İletişim · Hesap) + mobil-özel "Bilgi" grubu (hukuki/bilgi sayfalarının tek girişi).
 * Etiketler web'in i18n anahtarlarıdır; web'de karşılığı olmayan mobil ekranlar (banka hesabı,
 * ödeme geçmişi, dil…) ilgili gruba eklenir. Satırlarda ikon yok (sade liste).
 *
 * Fabrika: etiketler çeviriden geldiği için modül düzeyinde kurulmaz (dil değişince yenilenir).
 */
export function buildProfileMenuGroups(t: TFunction, ctx: ProfileMenuContext): ProfileMenuGroup[] {
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
      items: [
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
      items: [
        {
          key: 'payments',
          label: t('profile.sidebar.odemelerim'),
          to: '/settings/payments',
          testID: 'profile-payments-link',
        },
        {
          key: 'payment-methods',
          label: t('profile.sidebar.odemeYontemleri'),
          to: '/settings/payment-methods',
          testID: 'profile-payment-methods-link',
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
        { key: 'bank-account', label: t('mobile.settingsBankAccount'), to: '/settings/bank-account' },
      ],
    },
    {
      key: 'collection',
      title: t('profile.sidebar.koleksiyon'),
      items: [
        { key: 'collections', label: t('collection.myCollections'), to: '/settings/collections' },
        { key: 'favorites', label: t('nav.favorites'), to: '/favorites' },
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
      items: [
        { key: 'analytics', label: t('profile.sidebar.istatistikler'), to: '/settings/analytics' },
      ],
    },
    {
      key: 'messaging',
      title: t('profile.sidebar.iletisim'),
      items: [
        { key: 'messages', label: t('nav.messages'), to: '/messages' },
        { key: 'notifications', label: t('nav.notifications'), to: '/notifications' },
        { key: 'support', label: t('mobile.settingsSupportTickets'), to: '/support' },
        { key: 'help', label: t('mobile.settingsHelpFaq'), to: '/help' },
      ],
    },
    {
      key: 'account',
      title: t('profile.sidebar.hesap'),
      items: [
        { key: 'addresses', label: t('mobile.settingsAddresses'), to: '/settings/addresses' },
        ...(ctx.showMembership
          ? [
              {
                key: 'membership',
                label: t('mobile.settingsMembershipPlan'),
                to: '/membership',
                testID: 'profile-membership-link',
                rightBadge: ctx.isPaidTier ? ctx.tierLabel : undefined,
              },
              {
                key: 'subscription',
                label: t('mobile.settingsSubscription'),
                to: '/settings/subscription',
                testID: 'profile-subscription-link',
              },
            ]
          : []),
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
        { key: 'notification-settings', label: t('mobile.settingsNotifications'), to: '/settings/notifications' },
        ...accountItem('newsletter'),
        { key: 'security', label: t('profile.sidebar.guvenlik'), to: '/settings/security' },
        {
          key: 'blocked',
          label: t('profile.sidebar.engellenenler'),
          to: '/settings/blocked-users',
          testID: 'profile-blocked-users-link',
        },
        {
          key: 'language',
          label: t('mobile.settingsLanguage'),
          to: '/settings/language',
          testID: 'profile-language-link',
        },
      ],
    },
    {
      key: 'info',
      title: t('common.info'),
      items: [
        { key: 'about', label: t('mobile.settingsAbout'), to: '/about' },
        { key: 'authenticity', label: t('mobile.settingsAuthenticity'), to: '/authenticity' },
        { key: 'collectors-guide', label: t('footer.collectorsGuide'), to: '/collectors-guide' },
        { key: 'platform-fee', label: t('footer.platformServiceFee'), to: '/platform-hizmet-bedeli' },
        ...buildInfoPages(t).map((p) => ({
          key: `info-${p.route}`,
          label: p.label,
          to: `/${p.route}`,
          testID: `profile-info-${p.route}-link`,
        })),
        ...buildLegalPages(t).map((p) => ({
          key: `legal-${p.slug}`,
          label: p.label,
          to: p.route as string,
          testID: `profile-legal-${p.slug}-link`,
        })),
      ],
    },
  ];
  return groups;
}
