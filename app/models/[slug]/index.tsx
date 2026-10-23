import { RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { pageListContentStyle, theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { withStackTabBar } from '@/components/shell/StackTabBar';
import { useTabBarPageScroll } from '@/components/shell/TabBarCollapse';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { useModelDetail } from './_hooks/useModelDetail';
import { ModelHero, ModelProductsGrid } from './_components/ModelSections';

const { colors } = theme;

/**
 * Model detail: PageShell (loading / not found) + cover header and the model's products. Floating bottom
 * tab bar (`withStackTabBar`) like the category screen: the page scrolls in its own `Animated.ScrollView`
 * (PageShell `mode="list"`) bound to `useTabBarPageScroll()`, which collapses the bar and drives the top
 * bar edge; `useTabBarInset()` is the bottom padding so the last section clears the bar.
 */
function ModelDetailScreen() {
  const { t } = useTranslation();
  const f = useModelDetail();
  const page = useTabBarPageScroll();
  const tabInset = useTabBarInset();
  return (
    <PageShell
      title={f.model?.name ?? t('product.model')}
      subtitle={f.model?.brand?.name}
      mode="list"
      scroll={page}
      loading={f.modelQuery.isLoading}
      error={f.modelLoadFailed || undefined}
      onRetry={() => f.modelQuery.refetch()}
      empty={f.notFound}
      emptyState={{
        icon: 'face-frown',
        title: t('models.noResults'),
        subtitle: t('models.notFoundDesc'),
        actionLabel: t('models.backToModels'),
        onAction: () => router.replace('/models'),
      }}
    >
      {f.model ? (
        <Animated.ScrollView
          {...page.listProps}
          testID="model-detail-scroll"
          contentContainerStyle={page.contentStyle([pageListContentStyle, { paddingBottom: tabInset }])}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={f.refreshing}
              onRefresh={f.onRefresh}
              colors={[colors.primary[600]!]}
              tintColor={colors.primary[600]!}
              progressViewOffset={page.topInset}
            />
          }
        >
          <ModelHero model={f.model} />
          <ModelProductsGrid f={f} />
        </Animated.ScrollView>
      ) : null}
    </PageShell>
  );
}

export default withStackTabBar(ModelDetailScreen);
