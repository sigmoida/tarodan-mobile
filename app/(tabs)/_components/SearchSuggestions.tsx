import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, theme } from '@/ui';

import { styles } from '../_lib/searchStyles';
import type { SearchController } from '../_hooks/useSearch';
import { formatPrice } from '@/utils/format';

const { colors } = theme;

/**
 * Dropdown shown under the search input: recent searches when the box is empty,
 * or the rich autocomplete (suggestions/products/sellers/brands/manufacturers/
 * categories) once ≥2 chars are typed.
 */
export function SearchSuggestions({ f }: { f: SearchController }) {
  const { t } = useTranslation();
  return (
    <>
      {/* Recent Searches */}
      {f.showRecentSearches && f.recentSearchQueries.length > 0 && !f.searchQuery && (
        <View style={styles.recentSearchesDropdown}>
          <View style={styles.recentSearchesHeader}>
            <Text style={styles.recentSearchesTitle}>{t('search.recentSearches')}</Text>
            <Pressable onPress={f.clearSearches}>
              <Text style={styles.clearRecentText}>{t('common.clear')}</Text>
            </Pressable>
          </View>
          {f.recentSearchQueries.map((query, index) => (
            <Pressable
              key={index}
              style={styles.recentSearchItem}
              onPress={() => f.handleRecentSearchSelect(query)}
            >
              <Text style={styles.recentSearchText}>{query}</Text>
              <Pressable
                onPress={() => f.removeSearch(query)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={18} color={colors.text.subtle} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

      {/* Autocomplete Rich */}
      {f.autocompleteOpen && f.autocompleteQuery.length >= 2 && f.autocomplete && (
        <View style={styles.recentSearchesDropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
            {f.autocomplete.suggestions && f.autocomplete.suggestions.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('search.suggestions')}</Text>
                {f.autocomplete.suggestions.slice(0, 5).map((s, i) => (
                  <Pressable
                    key={`s-${i}`}
                    style={styles.acItem}
                    onPress={() => {
                      f.setSearchQuery(s);
                      f.setAutocompleteOpen(false);
                    }}
                  >
                    <Text style={styles.acItemText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {f.autocomplete.products && f.autocomplete.products.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('product.title')}</Text>
                {f.autocomplete.products.slice(0, 5).map((p) => (
                  <Pressable
                    key={`p-${p.id}`}
                    style={styles.acItem}
                    onPress={() => {
                      f.setAutocompleteOpen(false);
                      router.push({ pathname: '/product/[id]', params: { id: p.id } } as any);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.acItemText} numberOfLines={1}>{p.title}</Text>
                      <Text style={styles.acItemMeta}>
                        {p.brandName ? `${p.brandName} · ` : ''}{formatPrice(p.price)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {f.sellerResults.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('search.sellers')}</Text>
                {f.sellerResults.slice(0, 6).map((s) => (
                  <Pressable
                    key={`s-${s.id}`}
                    style={styles.acItem}
                    onPress={() => {
                      f.setAutocompleteOpen(false);
                      router.push(`/seller/${s.id}` as any);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.acItemText} numberOfLines={1}>{s.displayName}</Text>
                      {typeof s.totalListings === 'number' ? (
                        <Text style={styles.acItemMeta}>{s.totalListings} ilan</Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {f.autocomplete.brands && f.autocomplete.brands.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('brands.title')}</Text>
                {f.autocomplete.brands.slice(0, 5).map((b) => (
                  <Pressable
                    key={`b-${b.id}`}
                    style={styles.acItem}
                    onPress={() =>
                      f.applyFacet({ brandId: b.id, brand: b.name, carModel: '', carModelId: '' })
                    }
                  >
                    <Text style={styles.acItemText}>{b.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {f.autocomplete.manufacturers && f.autocomplete.manufacturers.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('nav.manufacturers')}</Text>
                {f.autocomplete.manufacturers.slice(0, 5).map((m) => (
                  <Pressable
                    key={`mf-${m.id}`}
                    style={styles.acItem}
                    onPress={() =>
                      f.applyFacet({ manufacturerId: m.id, manufacturer: m.name })
                    }
                  >
                    <Text style={styles.acItemText}>{m.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {f.autocomplete.categories && f.autocomplete.categories.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('footer.categories')}</Text>
                {f.autocomplete.categories.slice(0, 5).map((c) => (
                  <Pressable
                    key={`c-${c.id}`}
                    style={styles.acItem}
                    onPress={() =>
                      f.applyFacet({ categoryId: c.id, category: c.name })
                    }
                  >
                    <Text style={styles.acItemText}>{c.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>
      )}
    </>
  );
}
