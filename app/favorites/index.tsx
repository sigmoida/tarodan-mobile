import { View, FlatList, RefreshControl } from 'react-native';
import { theme, Text, Button, Spinner, Snackbar, ScreenHeader } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFavoritesScreen } from './_hooks/useFavoritesScreen';
import { styles } from './_lib/styles';
import { FavoriteCard } from './_components/FavoriteCard';

const { colors } = theme;

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const f = useFavoritesScreen();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!f.isAuthenticated) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('favorites.myFavorites')} onBack={back} />
        <View style={styles.centeredContainer}>
          <Ionicons name="heart-outline" size={64} color={colors.primary[600]!} />
          <Text variant="h2" style={styles.title}>{t('favorites.myFavorites')}</Text>
          <Text variant="body" style={styles.subtitle}>{t('favorites.loginRequired')}</Text>
          <Button variant="primary" title={t('common.login')} onPress={() => router.push('/(auth)/login')} style={styles.button} />
          <Button variant="ghost" title={t('auth.createAccount')} onPress={() => router.push('/(auth)/register')} style={{ alignSelf: 'center' }} />
        </View>
      </View>
    );
  }

  if (f.isLoading && f.items.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Spinner size="lg" />
        <Text style={{ marginTop: theme.spacing[4] }}>{t('favorites.loadingText')}</Text>
      </View>
    );
  }

  if (f.error && f.items.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="cloud-offline-outline" size={64} color={colors.text.subtle} />
        <Text style={{ marginTop: theme.spacing[4], fontSize: 16, fontWeight: '600', color: colors.text.heading }}>{t('favorites.loadFailedTitle')}</Text>
        <Text style={{ marginTop: theme.spacing[2], color: colors.text.subtle, textAlign: 'center' }}>{t('favorites.loadErrorDesc')}</Text>
        <Button variant="primary" title={t('common.tryAgain')} onPress={() => f.fetchFavorites()} style={{ marginTop: theme.spacing[4], alignSelf: 'center' }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={`${t('favorites.myFavorites')} (${f.getFavoriteCount()})`} onBack={back} />

      {f.items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={colors.text.subtle} />
          <Text variant="h3" style={styles.emptyTitle}>{t('favorites.empty')}</Text>
          <Text variant="body" style={styles.emptySubtitle}>
            {t('favorites.emptyStateDesc')}
          </Text>
          <Button variant="primary" title={t('order.exploreProducts')} onPress={() => router.push('/(tabs)/search')} style={styles.browseButton} />
        </View>
      ) : (
        <FlatList
          data={f.items}
          keyExtractor={(item) => item.id}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} colors={[colors.primary[600]!]} />
          }
          ListFooterComponent={
            <>
              <View style={styles.recommendationsSection}>
                <Text variant="h3" style={styles.sectionTitle}>{t('favorites.recommendationsTitle')}</Text>
                <Button variant="outline" title={t('favorites.exploreMoreProducts')} style={{ alignSelf: 'center' }} onPress={() => router.push('/(tabs)/search')} />
              </View>
              <View style={{ height: 100 }} />
            </>
          }
          renderItem={({ item }) => <FavoriteCard item={item} f={f} />}
        />
      )}

      <Snackbar
        visible={f.snackbar.visible}
        onDismiss={() => f.setSnackbar({ ...f.snackbar, visible: false })}
        duration={2000}
        action={{ label: t('product.goToCart'), onPress: () => router.push('/cart') }}
      >
        {f.snackbar.message}
      </Snackbar>
    </View>
  );
}
