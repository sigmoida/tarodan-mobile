import React from 'react';
import { View } from 'react-native';
import { styles } from '../_lib/searchStyles';
import { SearchInputBox } from './SearchInputBox';
import { SearchSuggestions } from './SearchSuggestions';
import type { SearchController } from '../_hooks/useSearch';

/** Üst barın ortasındaki arama alanı (PageShell `titleSlot`): controller'dan kutu prop'ları. */
export function SearchHeaderField({ f, ready }: { f: SearchController; ready: boolean }) {
  return (
    <SearchInputBox
      initialValue={f.initialQuery}
      command={f.inputCommand}
      autoFocus={f.autoFocusSearch}
      ready={ready}
      suggestionsOpen={f.suggestionsOpen}
      onCommit={f.commitQuery}
      onEmptyChange={f.setInputEmpty}
      onSubmit={f.saveRecentSearch}
      onClose={f.closeSuggestions}
      onFocus={f.onInputFocus}
      onBlur={f.onInputBlur}
    />
  );
}

/**
 * Öneri / son aramalar: açıkken üst barın altındaki TÜM sayfayı kaplar (çubuklar + sonuçların yerine);
 * kapalıyken hiç çizilmez.
 */
export function SearchSuggestionsLayer({ f }: { f: SearchController }) {
  if (!f.suggestionsOpen) return null;
  return (
    <View style={styles.suggestionsPage}>
      <SearchSuggestions
        showRecentSearches={f.showRecentSearches}
        recentSearchQueries={f.recentSearchQueries}
        inputEmpty={f.inputEmpty}
        onClearRecent={f.clearSearches}
        onSelectRecent={f.handleRecentSearchSelect}
        onRemoveRecent={f.removeSearch}
        autocompleteOpen={f.autocompleteOpen}
        autocompleteQuery={f.autocompleteQuery}
        autocomplete={f.autocomplete}
        sellerResults={f.sellerResults}
        onPickSuggestion={f.pickSuggestion}
        onCloseAutocomplete={f.closeAutocomplete}
        onNavigateSuggestion={f.confirmQuery}
        onApplyFacet={f.applyFacet}
      />
    </View>
  );
}
