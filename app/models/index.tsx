import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip, Spinner, Input, EmptyState } from '@/ui';
import { ScreenHeader, ThemedRefreshControl } from '@/components/common';
import { useModels } from './_hooks/useModels';
import { styles } from './_lib/styles';
import { ModelsBrandSection } from './_components/ModelsBrandSection';

export default function ModelsScreen() {
  const { t } = useTranslation();
  const f = useModels();

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('models.title')} />

      <View style={styles.searchWrap}>
        <Input
          placeholder={t('models.searchPlaceholder')}
          value={f.search}
          onChangeText={f.setSearch}
          leftIconName="search"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.brandFilterScroll}
        contentContainerStyle={styles.brandFilterRow}
      >
        <Chip label={t('models.allBrands')} selected={f.selectedBrand === 'all'} onPress={() => f.setSelectedBrand('all')} variant="primary" />
        {f.brands.map((b) => (
          <Chip
            key={b.slug}
            label={b.name}
            selected={f.selectedBrand === b.slug}
            onPress={() => f.setSelectedBrand(b.slug)}
            variant="primary"
          />
        ))}
      </ScrollView>

      {f.isLoading ? (
        <View style={styles.loading}>
          <Spinner size="lg" />
        </View>
      ) : f.grouped.length === 0 ? (
        <EmptyState
          icon="car-outline"
          title={t('models.noResults')}
          subtitle={f.search ? t('models.emptySearchHint') : t('models.emptyHint')}
        />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<ThemedRefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} />}
        >
          {f.grouped.map(({ brand, models }) => (
            <ModelsBrandSection key={brand.slug} brand={brand} models={models} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
