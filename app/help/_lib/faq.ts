import { Linking } from 'react-native';
import type { TFunction } from 'i18next';
import {
  RETURN_REQUEST_DAYS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_WHATSAPP,
} from '@/constants/legalFacts';

export type FaqCategory = {
  id: string;
  title: string;
  icon: string;
  questions: { q: string; a: string }[];
};

/**
 * FAQ kategorileri çeviriden geldiği için liste bir FABRİKA: modül seviyesinde
 * kurulsaydı `t` daha hazır olmadan çalışır ve metinler ilk dilde donardı
 * (bkz. `guides.tsx` / `buildQuickActionItems`).
 *
 * Birkaç soru/cevap burada ve `app/faq.tsx`de (SSS ekranı) neredeyse birebir
 * tekrar ediyordu; ortak olanlar tek kaynağa (`faqShared.*`) taşındı, yalnız
 * Yardım Merkezi'ne özgü olanlar `helpFaq.*`de.
 */
export const buildFaqCategories = (t: TFunction): FaqCategory[] => [
  {
    id: 'general',
    title: t('helpFaq.categories.general'),
    icon: 'help-circle-outline',
    questions: [
      { q: t('helpFaq.general.whatIsTarodan.q'), a: t('helpFaq.general.whatIsTarodan.a') },
      { q: t('helpFaq.general.howToJoin.q'), a: t('helpFaq.general.howToJoin.a') },
      { q: t('faqShared.premiumBenefits.q'), a: t('faqShared.premiumBenefits.a') },
    ],
  },
  {
    id: 'buying',
    title: t('faq.buying'),
    icon: 'cart-outline',
    questions: [
      { q: t('faqShared.guestCheckout.q'), a: t('faqShared.guestCheckout.a') },
      { q: t('faqShared.paymentMethods.q'), a: t('faqShared.paymentMethods.a') },
      { q: t('faqShared.orderTracking.q'), a: t('faqShared.orderTracking.a') },
      {
        q: t('helpFaq.buying.returnPolicy.q'),
        a: t('helpFaq.buying.returnPolicy.a', { days: RETURN_REQUEST_DAYS }),
      },
    ],
  },
  {
    id: 'selling',
    title: t('faqShared.categories.selling'),
    icon: 'pricetag-outline',
    questions: [
      { q: t('faqShared.howToList.q'), a: t('faqShared.howToList.a') },
      { q: t('helpFaq.selling.listingFee.q'), a: t('helpFaq.selling.listingFee.a') },
      { q: t('faqShared.commissionRate.q'), a: t('faqShared.commissionRate.a') },
      { q: t('faqShared.payoutTiming.q'), a: t('faqShared.payoutTiming.a') },
    ],
  },
  {
    id: 'trading',
    title: t('faq.trade'),
    icon: 'swap-horizontal',
    questions: [
      { q: t('faqShared.howTradeWorks.q'), a: t('faqShared.howTradeWorks.a') },
      { q: t('faqShared.tradeSafety.q'), a: t('faqShared.tradeSafety.a') },
      { q: t('helpFaq.trading.cashDifference.q'), a: t('helpFaq.trading.cashDifference.a') },
    ],
  },
  {
    id: 'account',
    title: t('helpFaq.categories.account'),
    icon: 'person-outline',
    questions: [
      { q: t('faqShared.forgotPassword.q'), a: t('faqShared.forgotPassword.a') },
      { q: t('faqShared.deleteAccount.q'), a: t('faqShared.deleteAccount.a') },
      { q: t('helpFaq.account.cancelSubscription.q'), a: t('helpFaq.account.cancelSubscription.a') },
    ],
  },
];

export type ContactOption = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  action: () => void;
};

export const buildContactOptions = (t: TFunction): ContactOption[] => [
  {
    id: 'email',
    title: t('common.email'),
    subtitle: SUPPORT_EMAIL,
    icon: 'mail-outline',
    action: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`),
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    subtitle: SUPPORT_WHATSAPP,
    icon: 'logo-whatsapp',
    action: () => Linking.openURL('https://wa.me/905551234567'),
  },
  {
    id: 'phone',
    title: t('common.phone'),
    subtitle: SUPPORT_PHONE,
    icon: 'call-outline',
    action: () => Linking.openURL('tel:08501234567'),
  },
];
