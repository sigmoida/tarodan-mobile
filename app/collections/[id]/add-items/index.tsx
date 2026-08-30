import { View, ScrollView } from 'react-native';
import { Button, Input, Snackbar, Spinner, Text, theme } from '@/ui';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAddItems } from './_hooks/useAddItems';
import { styles } from './_lib/styles';
import { ListingPickerRow } from './_components/ListingPickerRow';

const { colors } = theme;

export default function AddCollectionItemsScreen() {
  const { t } = useTranslation();
  const f = useAddItems();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('collection.addProduct'),
          headerStyle: { backgroundColor: colors.primary[600]! },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      <View style={styles.searchBar}>
        <Input
          placeholder={t('collection.searchListingsPlaceholder')}
          value={f.search}
          onChangeText={f.setSearch}
          leftIconName="search"
          autoCorrect={false}
        />
      </View>

      {f.isLoading ? (
        <View style={styles.centered}>
          <Spinner size="lg" />
        </View>
      ) : f.listings.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cube-outline" size={48} color={colors.text.muted} />
          <Text style={styles.emptyText}>{t('collection.noActiveListings')}</Text>
          <Button
            variant="primary"
            title={t('product.createListing')}
            icon="add"
            onPress={() => router.push('/(tabs)/sell')}
            style={{ marginTop: theme.spacing[4], alignSelf: 'center' }}
          />
        </View>
      ) : f.filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color={colors.text.muted} />
          <Text style={styles.emptyText}>{t('collection.noSearchMatch')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {f.filtered.map((listing) => (
            <ListingPickerRow key={listing.id} listing={listing} f={f} />
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <Snackbar
        visible={f.snackbar.visible}
        onDismiss={() => f.setSnackbar({ ...f.snackbar, visible: false })}
        duration={2000}
      >
        {f.snackbar.message}
      </Snackbar>
    </View>
  );
}
