/**
 * Kategoriler (`/categories`) — sekme köklerindeki sol düğmenin (squares-2x2) yığın ekranı. Düzen:
 * SOL dikey ray (Keşfet / Kategoriler / Üreticiler / Ölçek) + SAĞ alan (seçili grubun başlığı + 3
 * sütunlu ızgara). Gruplar ve hedefler web'in katalog menüsüyle aynı kaynak (`_lib/groups`); her
 * kutu `/listings` yığın rotasını açar. Yükleme: gösterilecek veri yokken tam ekran iskelet; sonra
 * grup bazında iskelet / "yüklenemedi" + tekrar dene (kaynaklar bağımsız). Çekip yenilenir.
 * Kontrolcü `useCategoriesScreen`.
 */
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { CategoriesSkeleton } from './_components/CategoriesSkeleton';
import { CategoryGrid } from './_components/CategoryGrid';
import { CategoryRail } from './_components/CategoryRail';
import { useCategoriesScreen } from './_hooks/useCategoriesScreen';

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const c = useCategoriesScreen();
  const { bottom } = useSafeAreaInsets();

  return (
    <PageShell
      title={t('nav.categories')}
      mode="static"
      padding={false}
      loading={c.isLoading}
      loadingFallback={<CategoriesSkeleton />}
      empty={c.groups.length === 0}
      emptyState={{
        icon: 'squares-2x2',
        title: t('nav.categoriesEmptyTitle'),
        subtitle: t('nav.categoriesEmptySubtitle'),
      }}
      testID="categories-screen"
    >
      <View style={styles.row}>
        <CategoryRail groups={c.groups} selectedKey={c.group?.key} onSelect={c.selectGroup} bottomInset={bottom} />
        <CategoryGrid
          // Grup/düzey değişince kaydırma başa döner.
          key={`${c.group?.key}:${c.title}`}
          title={c.title}
          tiles={c.tiles}
          status={c.group?.status ?? 'ready'}
          onRetry={c.retryGroup}
          footer={c.canGoBack ? undefined : c.group?.footer}
          canGoBack={c.canGoBack}
          parentTitle={c.parentTitle}
          onBack={c.back}
          onPressTile={c.pressTile}
          onPressFooter={c.openHref}
          refreshing={c.isRefetching}
          onRefresh={c.refetchAll}
          bottomInset={bottom}
        />
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
});
