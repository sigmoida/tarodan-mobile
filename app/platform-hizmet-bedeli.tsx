import { View, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme, Text, ScreenHeader } from '@/ui';
import { SUPPORT_EMAIL } from '@/constants/legalFacts';

const { colors } = theme;

/**
 * Platform Hizmet Bedeli şeffaflık sayfası. Web karşılığı:
 * apps/web/src/app/platform-hizmet-bedeli/page.tsx.
 *
 * §1–2 web'den KASITLI olarak ayrışıyor: web hâlâ "%3" ve "500 TL → 15 TL"
 * yazıyor, canlı `pricing.buyerFeeRate` ise 10 (staging, 2026-08-03) — yani metin
 * gerçeğin dörtte birini söylüyordu. Oranı burada sabit yazmak aynı hatayı tekrar
 * eder; sayfa oranı sunucudan okuyamıyor (public ayar ucu `{}` dönüyor, oran
 * yalnız sepet quote'unda gelir), bu yüzden sayı vermek yerine kullanıcı ödeme
 * özetine yönlendiriliyor. Web tarafı da düzeltilmeli (bu reponun kapsamı dışı).
 */
export default function PlatformHizmetBedeliScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('mobile.pagePlatformFee')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>{t('legalContact.lastUpdatedJun2026')}</Text>

        <Text style={styles.sectionTitle}>{t('platformFeePage.s1Title')}</Text>
        <Text style={styles.paragraph}>{t('platformFeePage.s1Content')}</Text>

        <Text style={styles.sectionTitle}>{t('platformFeePage.s2Title')}</Text>
        <Text style={styles.listItem}>{t('platformFeePage.s2Item1')}</Text>
        <Text style={styles.listItem}>{t('platformFeePage.s2Item2')}</Text>
        <Text style={styles.listItem}>{t('platformFeePage.s2Item3')}</Text>
        <Text style={styles.paragraph}>{t('platformFeePage.s2Outro')}</Text>

        <Text style={styles.sectionTitle}>{t('platformFeePage.s3Title')}</Text>
        <Text style={styles.paragraph}>{t('platformFeePage.s3Intro')}</Text>
        <Text style={styles.listItem}>{t('platformFeePage.s3Item1')}</Text>
        <Text style={styles.listItem}>{t('platformFeePage.s3Item2')}</Text>
        <Text style={styles.listItem}>{t('platformFeePage.s3Item3')}</Text>
        <Text style={styles.listItem}>{t('platformFeePage.s3Item4')}</Text>

        <Text style={styles.sectionTitle}>{t('platformFeePage.s4Title')}</Text>
        <Text style={styles.paragraph}>{t('platformFeePage.s4Intro')}</Text>
        <Text style={styles.listItem}>{t('platformFeePage.s4Item1')}</Text>
        <Text style={styles.listItem}>{t('platformFeePage.s4Item2')}</Text>
        <Text style={styles.listItem}>{t('platformFeePage.s4Item3')}</Text>
        <Text style={styles.listItem}>{t('platformFeePage.s4Item4')}</Text>

        <Text style={styles.sectionTitle}>{t('platformFeePage.s5Title')}</Text>
        <Text style={styles.paragraph}>{t('platformFeePage.s5Content')}</Text>

        <Text style={styles.sectionTitle}>{t('platformFeePage.s6Title')}</Text>
        <Text style={styles.paragraph}>
          {t('platformFeePage.s6Content', { email: SUPPORT_EMAIL })}
        </Text>

        <Text style={styles.disclaimer}>{t('platformFeePage.disclaimer')}</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    padding: theme.spacing[5],
  },
  lastUpdated: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.heading,
    marginTop: theme.spacing[6],
    marginBottom: theme.spacing[3],
  },
  paragraph: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 22,
    marginBottom: theme.spacing[3],
  },
  listItem: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 24,
    marginLeft: theme.spacing[2],
  },
  disclaimer: {
    fontSize: 13,
    color: colors.text.subtle,
    lineHeight: 20,
    marginTop: theme.spacing[6],
  },
});
