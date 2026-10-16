import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Button, SectionCard, Text, theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { useHardwareBackToHome } from '@/hooks/useBlockHardwareBack';
import { PaymentResultCard } from '@/components/payment/PaymentResultCard';
import { router, useLocalSearchParams, Redirect } from 'expo-router';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { requestVerify, verifyBudgetWaitMs } from '@/lib/payment/verifyPacer';
import type { TFunction } from 'i18next';

/** Verify denemeleri: PayTR durum sorgusu ödemeden birkaç sn sonra "ödendi" dönebilir. */
const VERIFY_ATTEMPTS = 5;
const VERIFY_RETRY_MS = 1200;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type TierKey = 'basic' | 'premium' | 'business';

type TierFeature = { label: string };

/**
 * Kademeye özel başarı özellikleri — `checkout/_lib/tiers.ts`teki
 * `buildMembershipTiers` ile AYNI sayı/anahtar seti (15/50/200 ücretsiz ilan,
 * "Takas özelliği"/"Koleksiyon oluşturma"/"API
 * erişimi"), drift'i önlemek için oradaki `membership.tierFeature*`
 * anahtarları yeniden kullanılıyor. `t` çağrıldığı ANDA çözülür (bkz.
 * UpgradePrompt) — bileşen `useMemo(() => buildTierFeatures(t), [t])` ile
 * çağırıyor.
 */
const buildTierFeatures = (t: TFunction): Record<TierKey, TierFeature[]> => ({
  basic: [
    { label: t('membership.tierFeatureFreeListings', { count: 15 }) },
    { label: t('membership.tierFeatureTrade') },
    { label: t('membership.tierFeatureCollectionCreate') },
  ],
  premium: [
    { label: t('membership.tierFeatureFreeListings', { count: 50 }) },
    { label: t('membership.tierFeatureTrade') },
    { label: t('membership.tierFeatureCollectionCreate') },
    // "Reklamsız deneyim" KALDIRILDI — banner'lar herkese gösteriliyor ve
    // sunucu her katman için `isAdFree: null` döndürüyor (staging, 2026-08-26).
    // Satın alma SONRASI ekranda duruyordu: kullanıcı parayı ödedikten sonra
    // karşılığı olmayan bir vaat okuyordu.
  ],
  business: [
    { label: t('membership.tierFeatureFreeListings', { count: 200 }) },
    { label: t('membership.tierFeatureTrade') },
    { label: t('membership.tierFeatureApiAccess') },
    { label: t('membership.tierFeatureSellerBadge') },
  ],
});

/**
 * iOS'ta üyelik satılmıyor (Apple 3.1.1); bu ekrana yalnız derin bağlantıyla
 * (`tarodan://membership/success`) ulaşılabiliyordu ve kademe tanıtımı
 * gösteriyordu. Yönlendirme sarmalayıcıda — gövdenin hook sırası sabit kalır.
 */
export default function MembershipSuccessScreen() {
  if (!CAN_BUY_DIGITAL) return <Redirect href="/membership" />;
  return <MembershipSuccessBody />;
}

function MembershipSuccessBody() {
  const { t } = useTranslation();
  const { paymentId, tier } = useLocalSearchParams<{ paymentId?: string; tier?: string }>();
  const { refreshUserData } = useAuthStore();
  const queryClient = useQueryClient();
  const tierFeatures = useMemo(() => buildTierFeatures(t), [t]);
  // Üyelik alındı: geri tuşu ödeme ekranına DÖNMEZ — ana sayfaya (iOS'ta geri oku/kaydırma kapalı).
  useHardwareBackToHome();

  // `?tier=` paramına göre içeriği kademeye uyarla; bilinmeyen/eksikse premium'a düş.
  const tierKey: TierKey = tier === 'basic' || tier === 'business' ? tier : 'premium';
  const tierName = tierKey === 'basic' ? t('membership.basic') : tierKey === 'business' ? t('membership.business') : t('membership.premium');
  const features = tierFeatures[tierKey];

  // PayTR dönüşü sonrası: üyeliği sunucu tarafında KESİNLEŞTİR, sonra yerel
  // kullanıcı + üyelik query'lerini tazele. Callback (ngrok) gecikse/ulaşmasa
  // bile verify (durum-sorgu) ile ödeme işlenir; aksi halde üyelik `past_due`
  // kalır ve "mevcut plan" Temel/ücretsiz görünür (order success ile aynı desen).
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (paymentId) {
        // PayTR'ın status-inquiry'si ödeme bittikten birkaç saniye sonra "ödendi"
        // dönebildiği için TEK verify çağrısı erken çalışıp başarısız olabilir. Üyeliği
        // gerçekten aktive eden tek çağrı verify (getStatus sadece DB'yi OKUR, aktive
        // ETMEZ); bu yüzden completed olana kadar verify'i tekrar dene. Aksi halde
        // üyelik past_due kalır ve ilan hakkı 5 (ücretsiz) görünür.
        //
        // Verify `verifyPacer` üzerinden: kart ödemesiyle AYNI global bütçe (sunucu
        // dakikada 10 verify) ve uçuş tekilleştirmesi. Kart formu bütçenin yalnız
        // kendi payını kullanır, bu ekrana yer kalır; yine de dolduysa (başka bir
        // ekran harcadı) yer açılana dek BEKLENİR — hiç verify göndermeden bitmez.
        // Verify'ın sonucu beklenir (10 sn'de terk edilmez): üyeliği o aktive eder,
        // kullanıcı verisi ondan SONRA tazelenir.
        for (let i = 0; i < VERIFY_ATTEMPTS && !cancelled; i++) {
          const wait = verifyBudgetWaitMs();
          if (wait > 0) await sleep(wait);
          if (cancelled) return;
          if (await requestVerify(paymentId, { awaitResult: true })) break;
          if (i < VERIFY_ATTEMPTS - 1 && !cancelled) await sleep(VERIFY_RETRY_MS);
        }
      }
      if (cancelled) return;
      await refreshUserData?.();
      // Tüm üyelik query'lerini tazele — profil rozeti (`qk.membership.me`) da `membership` kökünün altında.
      queryClient.invalidateQueries({ queryKey: qk.membership.all });
    };
    run();
    return () => { cancelled = true; };
  }, [paymentId, refreshUserData, queryClient]);

  return (
    <PageShell title={t('membership.checkoutTitle')} showBack={false}>
      <PaymentResultCard
        tone="success"
        title={t('membership.successTitle')}
        description={t('membership.successDescription', { tierName })}
        actions={
          <>
            <Button variant="primary" title={t('error.goHome')} fullWidth onPress={() => router.replace('/(tabs)')} />
            <Button
              variant="outline"
              title={t('membership.successViewListings')}
              fullWidth
              onPress={() => router.push('/settings/my-listings')}
            />
          </>
        }
      >
        <SectionCard bodyStyle={{ gap: theme.spacing[2] }}>
          {features.map((feat) => (
            <View key={feat.label} style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
              <Text variant="body" tone="muted">•</Text>
              <Text variant="body" tone="heading" style={{ flex: 1 }}>{feat.label}</Text>
            </View>
          ))}
        </SectionCard>
      </PaymentResultCard>
    </PageShell>
  );
}
