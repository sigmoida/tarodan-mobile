/**
 * Web `apps/web/src/components/SidebarFilters.tsx` paritesi — mobil filtre paneli.
 * Bölümler: Araç Türü, Marka, Ölçek, Malzeme, Üretici,
 * Durum, Fiyat, Seçenekler (takas/indirim).
 *
 * Alttan açılan `BottomSheet` (`size="large"`): [Temizle] [N Sonuç Göster] gövdenin DIŞINDA
 * sabit footer'da — güvenli alan (home indicator / gezinti çubuğu) kadar alt boşluklu, klavye
 * açılınca klavyenin üstünde; `ButtonRow` ile etiket asla sarmaz (sığmazsa alt alta).
 * İçerik yalnız panel açıkken bağlanır (`FilterSheetBody`).
 */
import { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  BottomSheet,
  Button,
  ButtonRow,
  Checkbox,
  Chip,
  Divider,
  Input,
  Text,
  theme,
  Icon,
} from '@/ui';
import { FilterOptionList, type FilterOption } from '@/components/filters/FilterOptionList';
import type { ProductFilters } from '../utils/productFilters';
import { buildConditionOptions, keepGeneralAttributeSelections } from '../utils/productFilters';
import type { ProductFilterOptions } from '../hooks/useProductFilterOptions';

const { colors, spacing } = theme;

type Props = {
  visible: boolean;
  onClose: () => void;
  filters: ProductFilters;
  onChange: (next: ProductFilters) => void;
  onClear: () => void;
  options: ProductFilterOptions;
  resultCount: number;
  countLoading?: boolean;
};

const PRICE_PRESETS: { label: string; min: string; max: string }[] = [
  { label: '0 - 100 TL', min: '0', max: '100' },
  { label: '100 - 500 TL', min: '100', max: '500' },
  { label: '500 - 1.000 TL', min: '500', max: '1000' },
  { label: '1.000+ TL', min: '1000', max: '' },
];

function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="label" weight="semibold" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

export default function ProductFilterSheet({
  visible,
  onClose,
  filters,
  onChange,
  onClear,
  options,
  resultCount,
  countLoading,
}: Props) {
  const { t } = useTranslation();
  return (
    <BottomSheet
      isOpen={visible}
      onClose={onClose}
      title={t('product.filters')}
      closeLabel={t('common.close')}
      size="large"
      testID="product-filter-sheet"
      footer={
        <ButtonRow testID="product-filter-footer">
          <Button
            key="clear"
            variant="outline"
            title={t('common.clear')}
            onPress={onClear}
            testID="product-filter-clear"
          />
          <Button
            key="apply"
            variant="primary"
            title={countLoading ? t('filter.resultsLoading') : t('filter.showResultsCount', { count: resultCount })}
            onPress={onClose}
            testID="product-filter-apply"
          />
        </ButtonRow>
      }
    >
      <FilterSheetBody filters={filters} onChange={onChange} options={options} />
    </BottomSheet>
  );
}

/** Panel gövdesi — yalnız açıkken bağlanır (BottomSheet içeriği). */
function FilterSheetBody({
  filters,
  onChange,
  options,
}: Pick<Props, 'filters' | 'onChange' | 'options'>) {
  const { t } = useTranslation();
  const conditionOptions = useMemo(() => buildConditionOptions(t), [t]);

  // --- Handlers (web SidebarFilters ile birebir) ---
  const selectCategory = (o: FilterOption) =>
    onChange(
      filters.categoryId === o.id
        ? { ...filters, categoryId: '', category: '' }
        : { ...filters, categoryId: o.id, category: o.label },
    );

  const selectBrand = (o: FilterOption) => {
    const isSel = filters.brandId === o.id;
    onChange(
      isSel ? { ...filters, brandId: '', brand: '' } : { ...filters, brandId: o.id, brand: o.label },
    );
  };

  const selectManufacturer = (o: FilterOption) =>
    // Üretici değişince YALNIZ üreticiye-özel attribute seçimlerini sıfırla (web ile
    // parite) — başka üreticinin attribute'ları yeni üreticide anlamsız; genel gruplar kalır.
    onChange(
      filters.manufacturerId === o.id
        ? {
            ...filters,
            manufacturerId: '',
            manufacturer: '',
            customAttributes: keepGeneralAttributeSelections(filters.customAttributes, options.customAttributes),
          }
        : {
            ...filters,
            manufacturerId: o.id,
            manufacturer: o.label,
            customAttributes: keepGeneralAttributeSelections(filters.customAttributes, options.customAttributes),
          },
    );

  const toggleCustomAttribute = (groupSlug: string, attrSlug: string) => {
    // Her custom attribute grubu tekli seçim: aynı değere tekrar basınca kaldır,
    // farklı değere basınca önceki seçimi değiştir. (web ile parite)
    const current = filters.customAttributes?.[groupSlug] ?? [];
    const isSelected = current.includes(attrSlug);
    const nextMap = { ...(filters.customAttributes ?? {}) };
    if (isSelected) delete nextMap[groupSlug];
    else nextMap[groupSlug] = [attrSlug];
    onChange({ ...filters, customAttributes: nextMap });
  };

  const toggleScale = (scale: string) =>
    onChange({ ...filters, scale: filters.scale === scale ? '' : scale });

  const toggleMaterial = (slug: string) =>
    onChange({ ...filters, material: filters.material === slug ? '' : slug });

  const toggleCondition = (o: FilterOption) =>
    onChange({ ...filters, condition: filters.condition === o.id ? '' : o.id });

  const categoryOptions = useMemo(
    () => options.categories.map((c) => ({ id: c.id, label: c.name })),
    [options.categories],
  );
  const brandOptions = useMemo(
    () => options.brands.map((b) => ({ id: b.id, label: b.name })),
    [options.brands],
  );
  const manufacturerOptions = useMemo(
    () => options.manufacturers.map((m) => ({ id: m.id, label: m.name })),
    [options.manufacturers],
  );
  const conditionList = useMemo(
    () => conditionOptions.map((c) => ({ id: c.value, label: c.label })),
    [conditionOptions],
  );

  return (
    <>
      {/* Arama */}
      <View style={styles.firstSection}>
        <SectionTitle>{t('filter.searchSectionTitle')}</SectionTitle>
        <Input
          placeholder={t('search.placeholderLong')}
          value={filters.search}
          onChangeText={(v) => onChange({ ...filters, search: v })}
          leftIconName="magnifying-glass"
          rightIcon={
            filters.search ? (
              <Pressable
                onPress={() => onChange({ ...filters, search: '' })}
                hitSlop={spacing[3]}
                accessibilityRole="button"
                accessibilityLabel={t('filter.clearSearchLabel')}
              >
                <Icon name="x-circle" variant="solid" size={theme.iconSize.md} color={colors.text.muted} />
              </Pressable>
            ) : undefined
          }
        />
      </View>

      {/* Araç Türü */}
      {categoryOptions.length > 0 && (
        <>
          <Divider style={styles.divider} />
          <View style={styles.section}>
            <SectionTitle>{t('product.vehicleType')}</SectionTitle>
            <FilterOptionList
              options={categoryOptions}
              selectedId={filters.categoryId}
              onSelect={selectCategory}
              testID="filter-category"
            />
          </View>
        </>
      )}

      <Divider style={styles.divider} />

      {/* Marka */}
      <View style={styles.section}>
        <SectionTitle>{t('product.brand')}</SectionTitle>
        <FilterOptionList
          options={brandOptions}
          selectedId={filters.brandId}
          onSelect={selectBrand}
          searchPlaceholder={t('brands.searchPlaceholder')}
          testID="filter-brand"
        />
      </View>

      <Divider style={styles.divider} />

      {/* Ölçek */}
      <View style={styles.section}>
        <SectionTitle>{t('product.scale')}</SectionTitle>
        <View style={styles.chipGrid}>
          {options.scales.map((s) => (
            <Chip key={s} label={s} selected={filters.scale === s} onPress={() => toggleScale(s)} />
          ))}
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Malzeme */}
      <View style={styles.section}>
        <SectionTitle>{t('product.material')}</SectionTitle>
        <View style={styles.chipGrid}>
          {options.materials.map((m) => (
            <Chip
              key={m.slug}
              label={m.label}
              selected={filters.material === m.slug}
              onPress={() => toggleMaterial(m.slug)}
            />
          ))}
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Üretici */}
      <View style={styles.section}>
        <SectionTitle>{t('product.manufacturer')}</SectionTitle>
        <FilterOptionList
          options={manufacturerOptions}
          selectedId={filters.manufacturerId}
          onSelect={selectManufacturer}
          searchPlaceholder={t('product.searchManufacturers')}
          testID="filter-manufacturer"
        />
      </View>

      {/* Özel attribute filtreleri: genel gruplar (örn Nadirlik) üretici seçmeden de gelir;
          üreticiye-özel olanlar (örn Hot Wheels: Segment...) üretici seçilince eklenir. Web SidebarFilters paritesi. */}
      {options.customAttributes.map((group) => (
        <View key={group.slug}>
          <Divider style={styles.divider} />
          <View style={styles.section}>
            <SectionTitle>{group.name}</SectionTitle>
            <FilterOptionList
              options={group.attributes.map((a) => ({ id: a.slug, label: a.label }))}
              selectedId={filters.customAttributes?.[group.slug]?.[0]}
              onSelect={(o) => toggleCustomAttribute(group.slug, o.id)}
            />
          </View>
        </View>
      ))}

      <Divider style={styles.divider} />

      {/* Durum */}
      <View style={styles.section}>
        <SectionTitle>{t('product.condition')}</SectionTitle>
        <FilterOptionList options={conditionList} selectedId={filters.condition} onSelect={toggleCondition} />
      </View>

      <Divider style={styles.divider} />

      {/* Fiyat */}
      <View style={styles.section}>
        <SectionTitle>{t('product.priceRange')}</SectionTitle>
        <View style={styles.chipGrid}>
          {PRICE_PRESETS.map((p) => {
            const active = filters.minPrice === p.min && filters.maxPrice === p.max;
            return (
              <Chip
                key={p.label}
                label={p.label}
                selected={active}
                onPress={() =>
                  onChange(
                    active
                      ? { ...filters, minPrice: '', maxPrice: '' }
                      : { ...filters, minPrice: p.min, maxPrice: p.max },
                  )
                }
              />
            );
          })}
        </View>
        <View style={styles.priceRow}>
          <View style={styles.flex}>
            <Input
              label={t('product.minPrice')}
              placeholder="0"
              keyboardType="numeric"
              value={filters.minPrice}
              onChangeText={(v) => onChange({ ...filters, minPrice: v.replace(/[^0-9]/g, '') })}
            />
          </View>
          <Text variant="body" tone="muted" style={styles.priceDash}>
            -
          </Text>
          <View style={styles.flex}>
            <Input
              label={t('product.maxPrice')}
              placeholder="∞"
              keyboardType="numeric"
              value={filters.maxPrice}
              onChangeText={(v) => onChange({ ...filters, maxPrice: v.replace(/[^0-9]/g, '') })}
            />
          </View>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Seçenekler */}
      <View style={styles.section}>
        <SectionTitle>{t('product.options')}</SectionTitle>
        <View style={styles.optionRow}>
          <Checkbox
            checked={filters.tradeOnly}
            onChange={(v) => onChange({ ...filters, tradeOnly: v })}
            label={t('product.tradeOnlyHint')}
          />
        </View>
        <View style={styles.optionRow}>
          <Checkbox
            checked={filters.discountOnly}
            onChange={(v) => onChange({ ...filters, discountOnly: v })}
            label={t('filter.discountOnlyLabel')}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  firstSection: { marginTop: spacing[1] },
  section: { marginTop: spacing[4] },
  sectionTitle: { marginBottom: spacing[3] },
  divider: { marginTop: spacing[4] },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing[3] },
  priceDash: { marginHorizontal: spacing[3], marginBottom: spacing[3] },
  flex: { flex: 1 },
  optionRow: { paddingVertical: spacing[2] },
});
