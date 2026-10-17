import { View, Pressable } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text } from '@/ui';
import { router } from 'expo-router';
import { styles } from '../_lib/styles';
import type { Brand, CarModel } from '../_lib/types';

/** Bir markanın başlığı (SectionCard) + o markaya ait model kartları (2 sütun). */
export function ModelsBrandSection({ brand, models }: { brand: Brand; models: CarModel[] }) {
  const { t } = useTranslation();
  return (
    <SectionCard
      title={brand.name}
      testID={`models-brand-${brand.slug}`}
      action={
        <Text variant="caption" tone="muted">
          {t('collection.modelCount', { count: models.length })}
          {brand.country ? ` · ${brand.country}` : ''}
        </Text>
      }
    >
      <View style={styles.grid}>
        {models.map((m) => (
          <Pressable
            key={m.id}
            style={({ pressed }) => [styles.modelCard, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/models/[slug]', params: { slug: m.slug } } as any)}
            accessibilityRole="button"
            accessibilityLabel={m.name}
          >
            <View style={styles.modelImage}>
              {m.image ? (
                <AppImage source={m.image} recyclingKey={String(m.id ?? m.slug)} style={styles.modelImageFill} />
              ) : null}
            </View>
            <View style={styles.modelBody}>
              <Text variant="bodySm" weight="medium" numberOfLines={1}>
                {m.name}
              </Text>
              {m.yearStart || m.yearEnd ? (
                <Text variant="caption" tone="subtle">
                  {m.yearStart ?? '?'}
                  {m.yearEnd ? ` - ${m.yearEnd}` : ` - ${t('models.present')}`}
                </Text>
              ) : null}
              {typeof m.productCount === 'number' ? (
                <Text variant="caption" tone="subtle">
                  {t('collection.itemCountSuffix', { count: m.productCount })}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </SectionCard>
  );
}
