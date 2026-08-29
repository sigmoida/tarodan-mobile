import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { readList } from '@/utils/apiEnvelope';
import { router, useLocalSearchParams } from 'expo-router';
import { appAlert } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { membershipApi, paymentsApi } from '@/lib/api';
import { captureException } from '@/services/sentry';
import { buildMembershipTiers, DEFAULT_MONTHLY, type MembershipTierKey } from '../_lib/tiers';

/**
 * Membership checkout controller — owns tier resolution, the DB-tier price query
 * (single source, backend charges exactly this), the auth redirect, and the
 * payment initiation (subscribe → bypass-complete OR PayTR WebView redirect).
 * ⚠️ PAYMENT-CRITICAL: handlePayment lifted VERBATIM — do not restructure the
 * subscribe/bypass/PayTR branch logic. (§12)
 */
export function useMembershipCheckout() {
  const { t } = useTranslation();
  const membershipTiers = useMemo(() => buildMembershipTiers(t), [t]);
  const { tier: tierParam, period: periodParam } = useLocalSearchParams<{ tier: string; period?: string }>();
  const { isAuthenticated, refreshUserData } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const tier = membershipTiers[tierParam as MembershipTierKey] || membershipTiers.premium;
  const tierType = (tierParam as string) || 'premium';
  const billingPeriod: 'monthly' | 'yearly' = periodParam === 'yearly' ? 'yearly' : 'monthly';

  // TEK FİYAT KAYNAĞI: DB MembershipTier (GET /membership/tiers) — backend ödemede
  // tam bunu tahsil eder. Web checkout ile birebir aynı. Eskiden /admin/settings/public
  // + hardcoded fallback'ler gösterilen tutarı çekilenle uyumsuzlaştırıyordu
  // (UI ₺499 / charge ₺249.99).
  // Katman fiyatları React Query ile (CLAUDE.md §6). Ulaşılamazsa varsayılan
  // fiyatlara düşülür — eski davranış korundu.
  const tiersQuery = useQuery({
    queryKey: qk.membership.tiers,
    queryFn: async () => readList<any>(await membershipApi.getTiers()),
  });

  const tierPrices = (() => {
    const t = tiersQuery.data?.find((x: any) => x.type === tierType);
    return t ? { monthlyPrice: Number(t.monthlyPrice), yearlyPrice: Number(t.yearlyPrice) } : null;
  })();

  // Ekranda gösterilecek fiyat (KDV dahil, nihai tahsil tutarı) — seçili periyoda göre.
  const displayPrice: number = (() => {
    if (tierPrices) {
      return billingPeriod === 'yearly' ? tierPrices.yearlyPrice : tierPrices.monthlyPrice;
    }
    // getTiers henüz dönmediyse / başarısızsa son çare fallback.
    const monthly = DEFAULT_MONTHLY[tierType] ?? tier.price;
    if (billingPeriod === 'yearly') return Math.round(monthly * 12 * 0.8);
    return monthly;
  })();

  // Fiyat kartındaki "/ay" ya da "/yıl" son eki — katalogtan (parite: iki dilde
  // sıra/ek farklı olabilir). `billingPeriod` KENDİSİ karşılaştırma için kalır;
  // Türkçe bir metin değerine karşı karşılaştırma yapılmaz (bkz. CheckoutSections).
  const periodLabel = billingPeriod === 'yearly' ? t('membership.perYear') : t('membership.perMonth');

  useEffect(() => {
    if (!isAuthenticated) router.replace('/(auth)/login');
  }, [isAuthenticated]);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Ödeme PayTR'nin barındırılan 3DS sayfasında alınır; uygulamada kart
      // formu yok (web ile parite).
      // subscribe: hedef kademeyi (ör. premium) past_due olarak AYARLAR ve ardından
      // ödemeyi başlatır (paymentId/paymentUrl/useBypass döner). Web ile parite.
      // Doğrudan initiatePayment çağırırsak backend ödemeyi kullanıcının MEVCUT
      // kademesine göre yapar → yükseltme gerçekleşmez, plan "Temel" kalır.
      const initResp: any = await membershipApi.subscribe({ tierType, billingPeriod });
      const initData = initResp?.data?.data ?? initResp?.data ?? {};
      const paymentId = initData.paymentId || initData.id || initData.payment?.id;

      // PAYMENT_BYPASS=true ortamında API gerçek PayTR token üretmez; `useBypass: true`
      // döner ve istemcinin /payments/:id/bypass-complete çağırması beklenir
      // (sipariş checkout'u ile birebir aynı desen).
      if (initData.useBypass === true) {
        if (paymentId) {
          try {
            await paymentsApi.bypassComplete(paymentId);
          } catch (bypassErr: any) {
            captureException(bypassErr, {
              level: 'error',
              tags: { flow: 'membership.bypassComplete' },
              extra: { paymentId, tierType },
            });
          }
        }
        await refreshUserData();
        setLoading(false);
        router.replace(`/membership/success?tier=${tierType}` as any);
        return;
      }

      // Gerçek PayTR akışı — WebView ödeme ekranına yönlendir.
      // Token burada üretildi; URL'i geçerek ekranın tekrar initiate etmesini önle.
      if (paymentId) {
        const paymentUrl: string | undefined = initData.paymentUrl;
        setLoading(false);
        router.replace({
          pathname: '/payment/[id]',
          params: {
            id: paymentId,
            provider: 'paytr',
            guest: '0',
            type: 'membership',
            // success ekranı doğru kademeyi göstersin diye taşı (yoksa hep "Premium" yazardı).
            tier: tierType,
            ...(paymentUrl ? { paymentUrl } : {}),
          },
        } as any);
        return;
      }

      throw new Error('Ödeme başlatılamadı (paymentId alınamadı).');
    } catch (e: any) {
      setLoading(false);
      captureException(e, {
        level: 'error',
        tags: { flow: 'membership.initiatePayment' },
        extra: { tierType, billingPeriod, status: e?.response?.status },
      });
      appAlert(
        t('membership.paymentErrorTitle'),
        e?.response?.data?.message || t('membership.paymentErrorGeneric'),
      );
    }
  };

  return {
    t,
    isAuthenticated,
    tier,
    billingPeriod,
    displayPrice,
    periodLabel,
    loading,
    handlePayment,
  };
}

export type MembershipCheckoutController = ReturnType<typeof useMembershipCheckout>;
