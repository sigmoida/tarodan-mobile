import React from 'react';
import { useTranslation } from 'react-i18next';

import { PickerModal } from './PickerModal';
import { YEAR_OPTIONS } from '../_lib/constants';
import type { Category, Brand, CarModel, Manufacturer, MaterialOption } from '../_lib/types';
import type { ListingFormController } from '../_hooks/useListingForm';
import { memoSection, type ListingFormKey } from '../_lib/memoSection';

/** Bu bileşenin okuduğu controller alanları (memo karşılaştırması; bkz. `memoSection`). */
const KEYS: readonly ListingFormKey[] = [
  'brandId',
  'brandSearch',
  'brands',
  'brandsLoading',
  'carModelId',
  'categoryId',
  'categorySearch',
  'customAttributes',
  'effectiveMaterials',
  'flatCategories',
  'manufacturerAttrGroups',
  'manufacturerId',
  'manufacturerList',
  'manufacturerSearch',
  'material',
  'models',
  'modelsLoading',
  'setBrandId',
  'setBrandSearch',
  'setCarModelId',
  'setCategoryId',
  'setCategorySearch',
  'setCustomAttributes',
  'setManufacturerId',
  'setManufacturerSearch',
  'setMaterial',
  'setShowAttrGroupPicker',
  'setShowBrandPicker',
  'setShowCategoryPicker',
  'setShowManufacturerPicker',
  'setShowMaterialPicker',
  'setShowModelPicker',
  'setShowYearPicker',
  'setYear',
  'showAttrGroupPicker',
  'showBrandPicker',
  'showCategoryPicker',
  'showManufacturerPicker',
  'showMaterialPicker',
  'showModelPicker',
  'showYearPicker',
  'year',
];

// Modül düzeyi çıkarıcılar: satır içi lambda her render'da `PickerModal`'ın seçenek listesini
// (yüzlerce marka/model) yeniden kurduruyordu.
const idKey = (item: { id: string }) => item.id;
const nameLabel = (item: { name: string }) => item.name;
const slugKey = (item: { slug: string }) => item.slug;
const labelLabel = (item: { label: string }) => item.label;
const yearKey = (item: number) => String(item);

/**
 * All picker/bottom-sheet modals for the listing form: category, brand, model,
 * material, manufacturer, year, and manufacturer-scoped attribute groups.
 */
export const ListingPickers = memoSection(function ListingPickers({ f }: { f: ListingFormController }) {
  const { t } = useTranslation();
  return (
    <>
      <PickerModal
        visible={f.showCategoryPicker}
        testID="picker-category"
        onClose={() => f.setShowCategoryPicker(false)}
        title={t('product.selectCategory')}
        data={f.flatCategories}
        onSelect={(item: Category) => f.setCategoryId(item.id)}
        selectedId={f.categoryId}
        searchValue={f.categorySearch}
        onSearchChange={f.setCategorySearch}
        keyExtractor={idKey}
        labelExtractor={nameLabel}
        emptyText={t('listing.categoryPickerEmpty')}
      />

      <PickerModal
        visible={f.showBrandPicker}
        testID="picker-brand"
        onClose={() => f.setShowBrandPicker(false)}
        title={t('product.selectBrand')}
        data={f.brands}
        onSelect={(item: Brand) => {
          f.setBrandId(item.id);
          f.setCarModelId('');
        }}
        selectedId={f.brandId}
        searchValue={f.brandSearch}
        onSearchChange={f.setBrandSearch}
        keyExtractor={idKey}
        labelExtractor={nameLabel}
        emptyText={t('brands.noResults')}
        loading={f.brandsLoading}
      />

      <PickerModal
        visible={f.showModelPicker}
        testID="picker-model"
        onClose={() => f.setShowModelPicker(false)}
        title={t('product.selectModel')}
        data={f.models}
        onSelect={(item: CarModel) => f.setCarModelId(item.id)}
        selectedId={f.carModelId}
        keyExtractor={idKey}
        labelExtractor={nameLabel}
        emptyText={t('models.noResults')}
        loading={f.modelsLoading}
      />

      <PickerModal
        visible={f.showMaterialPicker}
        testID="picker-material"
        onClose={() => f.setShowMaterialPicker(false)}
        title={t('product.selectMaterial')}
        data={f.effectiveMaterials}
        onSelect={(item: MaterialOption) => f.setMaterial(item.slug)}
        selectedId={f.material}
        keyExtractor={slugKey}
        labelExtractor={labelLabel}
        emptyText={t('listing.materialPickerEmpty')}
      />

      <PickerModal
        visible={f.showManufacturerPicker}
        testID="picker-manufacturer"
        onClose={() => f.setShowManufacturerPicker(false)}
        title={t('product.selectManufacturer')}
        data={f.manufacturerList}
        onSelect={(item: Manufacturer) => f.setManufacturerId(item.id)}
        selectedId={f.manufacturerId}
        searchValue={f.manufacturerSearch}
        onSearchChange={f.setManufacturerSearch}
        keyExtractor={idKey}
        labelExtractor={nameLabel}
        emptyText={t('listing.manufacturerPickerEmpty')}
      />

      <PickerModal
        visible={f.showYearPicker}
        testID="picker-year"
        onClose={() => f.setShowYearPicker(false)}
        title={t('product.selectYear')}
        data={YEAR_OPTIONS}
        onSelect={(item: number) => f.setYear(String(item))}
        selectedId={f.year}
        keyExtractor={yearKey}
        labelExtractor={yearKey}
        emptyText={t('listing.yearPickerEmpty')}
      />

      {f.manufacturerAttrGroups.map((group) => {
        const selected = f.customAttributes[group.slug] ?? [];
        return (
          <PickerModal
            key={group.slug}
            modalKey={group.slug}
            testID={`picker-attr-${group.slug}`}
            visible={f.showAttrGroupPicker === group.slug}
            onClose={() => f.setShowAttrGroupPicker(null)}
            title={t('product.selectAttribute', { name: group.name })}
            data={group.attributes}
            onSelect={(item: { slug: string; label: string }) => {
              f.setCustomAttributes((prev) => {
                const next = { ...prev };
                const current = next[group.slug] ?? [];
                if (current.length === 1 && current[0] === item.slug) {
                  delete next[group.slug];
                } else {
                  next[group.slug] = [item.slug];
                }
                return next;
              });
            }}
            selectedId={selected[0] ?? ''}
            keyExtractor={slugKey}
            labelExtractor={labelLabel}
            emptyText={t('common.noResults')}
          />
        );
      })}
    </>
  );
}, KEYS);
