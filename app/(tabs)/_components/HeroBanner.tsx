import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Text } from '@/ui';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { homeStyles as styles } from '../_lib/homeStyles';

/**
 * Yönetilen hero slaytı yokken kullanılan statik yedek hero (uygulama ilk açılışta boş
 * görünmesin). Web hero'su gibi yükseltilmiş yüzey + kenarlık; iki aksiyon.
 */
export function HeroBanner() {
  const { t } = useTranslation();
  const { showCollectionEntry } = useFeatureAccess();
  return (
    <View style={styles.heroBanner} testID="hero-banner">
      <Text variant="h2">{t('home.heroTitle')}</Text>
      <Text variant="body" tone="primary" weight="semibold">
        {t('home.heroSubtitle')}
      </Text>
      <Text variant="bodySm" tone="muted">
        {t('home.slider.marketplaceSubtitle')}
      </Text>
      <View style={styles.heroButtons}>
        {/* iOS: koleksiyon oluşturamayana "Koleksiyon oluştur" gösterilmez. */}
        {showCollectionEntry ? (
          <Button title={t('home.heroCreateCollection')} onPress={() => router.push('/profile')} fullWidth />
        ) : null}
        <Button
          variant="outline"
          title={t('home.heroBrowseMarket')}
          onPress={() => router.push('/search')}
          fullWidth
        />
      </View>
    </View>
  );
}
