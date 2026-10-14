import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip, EmptyState, Input, SkeletonText } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { useModels } from './_hooks/useModels';
import { styles } from './_lib/styles';
import { ModelsBrandSection } from './_components/ModelsBrandSection';

/** Modeller — PageShell + arama, marka çipleri ve marka başına SectionCard model ızgarası. */
export default function ModelsScreen() {
  const { t } = useTranslation();
  const f = useModels();

  return (
    <PageShell
      title={t('models.title')}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      loading={f.isLoading}
      loadingFallback={<SkeletonText lines={8} />}
    >
      <View style={styles.filters}>
        <Input
          placeholder={t('models.searchPlaceholder')}
          value={f.search}
          onChangeText={f.setSearch}
          leftIconName="magnifying-glass"
        />
        <ScrollView
          horizontal
          style={styles.chipsScroll}
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip label={t('models.allBrands')} selected={f.selectedBrand === 'all'} onPress={() => f.setSelectedBrand('all')} />
          {f.brands.map((b) => (
            <Chip key={b.slug} label={b.name} selected={f.selectedBrand === b.slug} onPress={() => f.setSelectedBrand(b.slug)} />
          ))}
        </ScrollView>
      </View>

      {f.grouped.length === 0 ? (
        <EmptyState
          icon="truck"
          title={t('models.noResults')}
          subtitle={f.search ? t('models.emptySearchHint') : t('models.emptyHint')}
        />
      ) : (
        f.grouped.map(({ brand, models }) => <ModelsBrandSection key={brand.slug} brand={brand} models={models} />)
      )}
    </PageShell>
  );
}
