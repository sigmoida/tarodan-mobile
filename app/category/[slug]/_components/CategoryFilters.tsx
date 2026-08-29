import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip, Input, Modal, Text, theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import { SCALES } from '@/theme/catalog';
import { styles } from '../_lib/styles';
import { buildSortOptions } from '../_lib/constants';
import type { CategoryController } from '../_hooks/useCategory';

const { colors } = theme;

/** Arama + sırala butonu/modalı + ölçek filtre çipleri. */
export function CategoryFilters({ f }: { f: CategoryController }) {
  const { t } = useTranslation();
  const sortOptions = buildSortOptions(t);
  return (
    <View style={styles.filterSection}>
      <Input
        placeholder={t('common.search')}
        value={f.searchQuery}
        onChangeText={f.setSearchQuery}
        leftIconName="search"
        containerStyle={styles.searchBar}
      />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => f.setSortMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('common.sort')}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="swap-vertical" size={18} color={colors.text.muted} />
          <Text style={styles.sortButtonText}>{f.getSortLabel()}</Text>
        </TouchableOpacity>
      </View>

      <Modal isOpen={f.sortMenuVisible} onClose={() => f.setSortMenuVisible(false)} title={t('common.sort')}>
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.menuItem}
            onPress={() => {
              f.setSortBy(option.id);
              f.setSortMenuVisible(false);
            }}
          >
            {f.sortBy === option.id ? (
              <Ionicons name="checkmark" size={20} color={colors.primary[600]!} />
            ) : (
              <View style={{ width: 20 }} />
            )}
            <Text style={styles.menuItemText}>{option.name}</Text>
          </TouchableOpacity>
        ))}
      </Modal>

      {/* Scale Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scaleChips}>
        <Chip label={t('common.all')} selected={!f.selectedScale} onPress={() => f.setSelectedScale('')} variant="primary" />
        {SCALES.slice(0, 6).map((scale) => (
          <Chip
            key={scale.id}
            label={scale.name}
            selected={f.selectedScale === scale.id}
            onPress={() => f.setSelectedScale(f.selectedScale === scale.id ? '' : scale.id)}
            variant="primary"
          />
        ))}
      </ScrollView>
    </View>
  );
}
