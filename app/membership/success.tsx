import { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { theme, Button, Text } from '@/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { paymentsApi } from '@/lib/api';
import type { TFunction } from 'i18next';

const { colors } = theme;

type TierKey = 'basic' | 'premium' | 'business';

type TierFeature = { icon: keyof typeof Ionicons.glyphMap; label: string };

/**
 * Kademeye özel başarı özellikleri — `checkout/_lib/tiers.ts`teki
 * `buildMembershipTiers` ile AYNI sayı/anahtar seti (15/50/200 ücretsiz ilan,
 * 2/10/50 öne çıkan ilan, "Takas özelliği"/"Koleksiyon oluşturma"/"API
 * erişimi"), drift'i önlemek için oradaki `membership.tierFeature*`
 * anahtarları yeniden kullanılıyor. `t` çağrıldığı ANDA çözülür (bkz.
 * UpgradePrompt) — bileşen `useMemo(() => buildTierFeatures(t), [t])` ile
 * çağırıyor.
 */
const buildTierFeatures = (t: TFunction): Record<TierKey, TierFeature[]> => ({
  basic: [
    { icon: 'list', label: t('membership.tierFeatureFreeListings', { count: 15 }) },
    { icon: 'swap-horizontal', label: t('membership.tierFeatureTrade') },
    { icon: 'albums', label: t('membership.tierFeatureCollectionCreate') },
    { icon: 'star', label: t('membership.tierFeatureFeaturedListings', { count: 2 }) },
  ],
  premium: [
    { icon: 'list', label: t('membership.tierFeatureFreeListings', { count: 50 }) },
    { icon: 'swap-horizontal', label: t('membership.tierFeatureTrade') },
    { icon: 'albums', label: t('membership.tierFeatureCollectionCreate') },
    { icon: 'star', label: t('membership.tierFeatureFeaturedListings', { count: 10 }) },
    // "Reklamsız deneyim" KALDIRILDI — banner'lar herkese gösteriliyor ve
    // sunucu her katman için `isAdFree: null` döndürüyor (staging, 2026-08-26).
    // Satın alma SONRASI ekranda duruyordu: kullanıcı parayı ödedikten sonra
    // karşılığı olmayan bir vaat okuyordu.
  ],
  business: [
    { icon: 'list', label: t('membership.tierFeatureFreeListings', { count: 200 }) },
    { icon: 'swap-horizontal', label: t('membership.tierFeatureTrade') },
    { icon: 'star', label: t('membership.tierFeatureFeaturedListings', { count: 50 }) },
    { icon: 'code-slash', label: t('membership.tierFeatureApiAccess') },
    { icon: 'ribbon', label: t('membership.tierFeatureSellerBadge') },
  ],
});

export default function MembershipSuccessScreen() {
  const { t } = useTranslation();
  const { paymentId, tier } = useLocalSearchParams<{ paymentId?: string; tier?: string }>();
  const { refreshUserData } = useAuthStore();
  const queryClient = useQueryClient();
  const tierFeatures = useMemo(() => buildTierFeatures(t), [t]);

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
        for (let i = 0; i < 5 && !cancelled; i++) {
          try {
            const res = await paymentsApi.verify(paymentId);
            const completed = (res.data?.data ?? res.data)?.completed;
            if (completed) break;
          } catch { /* best-effort */ }
          if (i < 4 && !cancelled) await new Promise((r) => setTimeout(r, 1200));
        }
      }
      if (cancelled) return;
      await refreshUserData?.();
      // Tüm üyelik query'lerini tazele (profil rozeti ['membership-me'] kullanır).
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      queryClient.invalidateQueries({ queryKey: ['membership-me'] });
    };
    run();
    return () => { cancelled = true; };
  }, [paymentId, refreshUserData, queryClient]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={100} color={colors.success[600]!} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('membership.successTitle')}</Text>

        {/* Description */}
        <Text style={styles.description}>
          {t('membership.successDescription', { tierName })}
        </Text>

        {/* Features */}
        <View style={styles.features}>
          {features.map((feat) => (
            <View key={feat.label} style={styles.featureItem}>
              <Ionicons name={feat.icon} size={24} color={colors.primary[600]!} />
              <Text style={styles.featureText}>{feat.label}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <Button
            variant="primary"
            title={t('error.goHome')}
            fullWidth
            onPress={() => router.replace('/(tabs)')}
            style={styles.primaryButton}
          />
          <Button
            variant="outline"
            title={t('membership.successViewListings')}
            fullWidth
            onPress={() => router.push('/settings/my-listings')}
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
  },
  iconContainer: {
    marginBottom: theme.spacing[6],
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.heading,
    marginBottom: theme.spacing[3],
  },
  description: {
    fontSize: 15,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing[8],
  },
  features: {
    width: '100%',
    backgroundColor: colors.surface.alt,
    borderRadius: theme.radius['3xl'],
    padding: theme.spacing[5],
    marginBottom: theme.spacing[8],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  featureText: {
    marginLeft: theme.spacing[4],
    fontSize: 15,
    color: colors.text.heading,
    fontWeight: '500',
  },
  buttons: {
    width: '100%',
    gap: theme.spacing[3],
  },
  primaryButton: {
    borderRadius: 12,
  },
  secondaryButton: {
    borderRadius: 12,
    borderColor: colors.primary[600]!,
  },
});
