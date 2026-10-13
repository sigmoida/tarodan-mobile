import React from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, RawText, RawTextInput, EmptyState } from '@/ui';

import { styles } from '../_lib/styles';

const { colors } = theme;

export interface PickerModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  onSelect: (item: any) => void;
  selectedId: string;
  searchValue?: string;
  onSearchChange?: (t: string) => void;
  keyExtractor: (item: any) => string;
  labelExtractor: (item: any) => string;
  emptyText?: string;
  loading?: boolean;
  modalKey?: string;
}

/**
 * Bottom-sheet picker used for category/brand/model/material/manufacturer/year
 * and manufacturer-scoped attribute selections. Lifted verbatim from the
 * monolith's `renderPickerModal` helper.
 */
export function PickerModal({
  visible,
  onClose,
  title,
  data,
  onSelect,
  selectedId,
  searchValue,
  onSearchChange,
  keyExtractor,
  labelExtractor,
  emptyText,
  loading,
  modalKey,
}: PickerModalProps) {
  const { t } = useTranslation();
  const filtered =
    searchValue !== undefined
      ? data.filter((item) =>
          labelExtractor(item).toLowerCase().includes((searchValue || '').toLowerCase())
        )
      : data;

  return (
    <Modal key={modalKey} visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <RawText style={styles.modalTitle}>{title}</RawText>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <RawText style={styles.modalClose}>✕</RawText>
            </TouchableOpacity>
          </View>

          {onSearchChange !== undefined && (
            <RawTextInput
              style={styles.modalSearch}
              placeholder={t('common.searchPlaceholder')}
              placeholderTextColor={colors.text.subtle}
              value={searchValue}
              onChangeText={onSearchChange}
              autoCorrect={false}
            />
          )}

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary[600]!} style={{ marginTop: theme.spacing[8] }} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => keyExtractor(item)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <EmptyState placement="inline" icon="magnifying-glass" title={emptyText || t('common.noResults')} subtitle={t('search.tryDifferent')} />
              }
              renderItem={({ item }) => {
                const isSelected = keyExtractor(item) === selectedId;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <RawText style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {labelExtractor(item)}
                    </RawText>
                    {isSelected && <RawText style={styles.checkMark}>✓</RawText>}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
