import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text, theme, Icon } from '@/ui';

import { styles } from '../_lib/searchStyles';
import type { SearchController } from '../_hooks/useSearch';
import type { ProductFilters } from '@/utils/productFilters';
import { formatPrice } from '@/utils/format';

const { colors } = theme;

/**
 * Dropdown shown under the search input: recent searches when the box is empty,
 * or the rich autocomplete (suggestions/products/sellers/brands/manufacturers/
 * categories) once ≥2 chars are typed.
 */
export interface SearchSuggestionsProps {
  showRecentSearches: boolean;
  recentSearchQueries: string[];
  /** Kutu boşken son aramalar görünür. */
  inputEmpty: boolean;
  onClearRecent: () => void;
  onSelectRecent: (query: string) => void;
  onRemoveRecent: (query: string) => void;
  autocompleteOpen: boolean;
  autocompleteQuery: string;
  autocomplete: SearchController['autocomplete'];
  sellerResults: SearchController['sellerResults'];
  /** Öneri metni seçilince: kutuyu doldur + paneli kapat. */
  onPickSuggestion: (text: string) => void;
  onCloseAutocomplete: () => void;
  /** Öneriden ürün/satıcıya gidilince (yazılan sorgu onaylanmış sayılır). */
  onNavigateSuggestion: () => void;
  onApplyFacet: (partial: Partial<ProductFilters>) => void;
}

function SearchSuggestionsBase({
  showRecentSearches,
  recentSearchQueries,
  inputEmpty,
  onClearRecent,
  onSelectRecent,
  onRemoveRecent,
  autocompleteOpen,
  autocompleteQuery,
  autocomplete,
  sellerResults,
  onPickSuggestion,
  onCloseAutocomplete,
  onNavigateSuggestion,
  onApplyFacet,
}: SearchSuggestionsProps) {
  const { t } = useTranslation();
  return (
    <>
      {/* Recent Searches */}
      {showRecentSearches && recentSearchQueries.length > 0 && inputEmpty && (
        <View style={styles.recentSearchesDropdown}>
          <View style={styles.recentSearchesHeader}>
            <Text style={styles.recentSearchesTitle}>{t('search.recentSearches')}</Text>
            <Pressable onPress={onClearRecent}>
              <Text style={styles.clearRecentText}>{t('common.clear')}</Text>
            </Pressable>
          </View>
          {recentSearchQueries.map((query, index) => (
            <Pressable
              key={index}
              style={styles.recentSearchItem}
              onPress={() => onSelectRecent(query)}
            >
              <Text style={styles.recentSearchText}>{query}</Text>
              <Pressable
                onPress={() => onRemoveRecent(query)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="x-mark" size={18} color={colors.text.subtle} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

      {/* Autocomplete Rich */}
      {autocompleteOpen && autocompleteQuery.length >= 2 && autocomplete && (
        <View style={styles.recentSearchesDropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
            {autocomplete.suggestions && autocomplete.suggestions.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('search.suggestions')}</Text>
                {autocomplete.suggestions.slice(0, 5).map((s, i) => (
                  <Pressable
                    key={`s-${i}`}
                    style={styles.acItem}
                    onPress={() => onPickSuggestion(s)}
                  >
                    <Text style={styles.acItemText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {autocomplete.products && autocomplete.products.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('product.title')}</Text>
                {autocomplete.products.slice(0, 5).map((p) => (
                  <Pressable
                    key={`p-${p.id}`}
                    style={styles.acItem}
                    onPress={() => {
                      onCloseAutocomplete();
                      onNavigateSuggestion();
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

            {sellerResults.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('search.sellers')}</Text>
                {sellerResults.slice(0, 6).map((s) => (
                  <Pressable
                    key={`s-${s.id}`}
                    style={styles.acItem}
                    onPress={() => {
                      onCloseAutocomplete();
                      onNavigateSuggestion();
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

            {autocomplete.brands && autocomplete.brands.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('brands.title')}</Text>
                {autocomplete.brands.slice(0, 5).map((b) => (
                  <Pressable
                    key={`b-${b.id}`}
                    style={styles.acItem}
                    onPress={() =>
                      onApplyFacet({ brandId: b.id, brand: b.name, carModel: '', carModelId: '' })
                    }
                  >
                    <Text style={styles.acItemText}>{b.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {autocomplete.manufacturers && autocomplete.manufacturers.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('nav.manufacturers')}</Text>
                {autocomplete.manufacturers.slice(0, 5).map((m) => (
                  <Pressable
                    key={`mf-${m.id}`}
                    style={styles.acItem}
                    onPress={() =>
                      onApplyFacet({ manufacturerId: m.id, manufacturer: m.name })
                    }
                  >
                    <Text style={styles.acItemText}>{m.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {autocomplete.categories && autocomplete.categories.length > 0 ? (
              <View style={styles.acSection}>
                <Text style={styles.acSectionTitle}>{t('footer.categories')}</Text>
                {autocomplete.categories.slice(0, 5).map((c) => (
                  <Pressable
                    key={`c-${c.id}`}
                    testID="search-category-suggestion"
                    style={styles.acItem}
                    onPress={() =>
                      onApplyFacet({ categoryId: c.id, category: c.name })
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

export const SearchSuggestions = React.memo(SearchSuggestionsBase);
