import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Spinner, EmptyState } from '@/ui';
import { router } from 'expo-router';
import { ScreenHeader, ThemedRefreshControl } from '@/components/common';
import { useModelDetail } from './_hooks/useModelDetail';
import { styles } from './_lib/styles';
import { ModelHero, ModelProductsGrid } from './_components/ModelSections';

export default function ModelDetailScreen() {
  const { t } = useTranslation();
  const f = useModelDetail();

  if (f.modelQuery.isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('product.model')} />
        <View style={styles.loading}>
          <Spinner size="lg" />
        </View>
      </View>
    );
  }

  if (f.modelQuery.isError || !f.model) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('product.model')} />
        <EmptyState
          icon="sad-outline"
          title={t('models.noResults')}
          subtitle={t('models.notFoundDesc')}
          actionLabel={t('models.backToModels')}
          onAction={() => router.replace('/models' as any)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={f.model.name} subtitle={f.model.brand?.name} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<ThemedRefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} />}
      >
        <ModelHero model={f.model} />
        <ModelProductsGrid f={f} />
      </ScrollView>
    </View>
  );
}
