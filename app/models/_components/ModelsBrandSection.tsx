import { View, Image, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { transformImageUrl } from '@/utils/imageUrl';
import { styles } from '../_lib/styles';
import type { Brand, CarModel } from '../_lib/types';

const { colors } = theme;

/** Bir markanın başlığı + o markaya ait model kartları grid'i. */
export function ModelsBrandSection({ brand, models }: { brand: Brand; models: CarModel[] }) {
  const { t } = useTranslation();
  return (
    <View style={styles.brandSection}>
      <View style={styles.brandHeader}>
        {brand.logo ? (
          <Image source={{ uri: transformImageUrl(brand.logo) }} style={styles.brandLogo} />
        ) : (
          <View style={[styles.brandLogo, styles.brandLogoFallback]}>
            <Ionicons name="car-sport-outline" size={18} color={colors.primary[600]!} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.brandName}>{brand.name}</Text>
          <Text style={styles.brandMeta}>
            {t('collection.modelCount', { count: models.length })}
            {brand.country ? ` · ${brand.country}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.modelsGrid}>
        {models.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.modelCard}
            onPress={() => router.push({ pathname: '/models/[slug]', params: { slug: m.slug } } as any)}
          >
            {m.image ? (
              <Image source={{ uri: transformImageUrl(m.image) }} style={styles.modelImage} />
            ) : (
              <View style={[styles.modelImage, styles.modelImageFallback]}>
                <Ionicons name="car-outline" size={36} color={colors.text.subtle} />
              </View>
            )}
            <View style={styles.modelBody}>
              <Text style={styles.modelName} numberOfLines={1}>{m.name}</Text>
              {m.yearStart || m.yearEnd ? (
                <Text style={styles.modelYears}>
                  {m.yearStart ?? '?'}{m.yearEnd ? ` - ${m.yearEnd}` : ` - ${t('models.present')}`}
                </Text>
              ) : null}
              {typeof m.productCount === 'number' ? (
                <Text style={styles.modelCount}>
                  {t('collection.itemCountSuffix', { count: m.productCount })}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
