import React from 'react';
import { useTranslation } from 'react-i18next';

import { PickerModal } from './PickerModal';
import { YEAR_OPTIONS } from '../_lib/constants';
import type { Category, Brand, CarModel, Manufacturer, MaterialOption } from '../_lib/types';
import type { ListingFormController } from '../_hooks/useListingForm';

/**
 * All picker/bottom-sheet modals for the listing form: category, brand, model,
 * material, manufacturer, year, and manufacturer-scoped attribute groups.
 */
export function ListingPickers({ f }: { f: ListingFormController }) {
  const { t } = useTranslation();
  return (
    <>
      <PickerModal
        visible={f.showCategoryPicker}
        onClose={() => f.setShowCategoryPicker(false)}
        title={t('product.selectCategory')}
        data={f.flatCategories}
        onSelect={(item: Category) => f.setCategoryId(item.id)}
        selectedId={f.categoryId}
        searchValue={f.categorySearch}
        onSearchChange={f.setCategorySearch}
        keyExtractor={(item: Category) => item.id}
        labelExtractor={(item: Category) => item.name}
        emptyText={t('listing.categoryPickerEmpty')}
      />

      <PickerModal
        visible={f.showBrandPicker}
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
        keyExtractor={(item: Brand) => item.id}
        labelExtractor={(item: Brand) => item.name}
        emptyText={t('brands.noResults')}
        loading={f.brandsLoading}
      />

      <PickerModal
        visible={f.showModelPicker}
        onClose={() => f.setShowModelPicker(false)}
        title={t('product.selectModel')}
        data={f.models}
        onSelect={(item: CarModel) => f.setCarModelId(item.id)}
        selectedId={f.carModelId}
        keyExtractor={(item: CarModel) => item.id}
        labelExtractor={(item: CarModel) => item.name}
        emptyText={t('models.noResults')}
        loading={f.modelsLoading}
      />

      <PickerModal
        visible={f.showMaterialPicker}
        onClose={() => f.setShowMaterialPicker(false)}
        title={t('product.selectMaterial')}
        data={f.effectiveMaterials}
        onSelect={(item: MaterialOption) => f.setMaterial(item.slug)}
        selectedId={f.material}
        keyExtractor={(item: MaterialOption) => item.slug}
        labelExtractor={(item: MaterialOption) => item.label}
        emptyText={t('listing.materialPickerEmpty')}
      />

      <PickerModal
        visible={f.showManufacturerPicker}
        onClose={() => f.setShowManufacturerPicker(false)}
        title={t('product.selectManufacturer')}
        data={f.manufacturerList}
        onSelect={(item: Manufacturer) => f.setManufacturerId(item.id)}
        selectedId={f.manufacturerId}
        searchValue={f.manufacturerSearch}
        onSearchChange={f.setManufacturerSearch}
        keyExtractor={(item: Manufacturer) => item.id}
        labelExtractor={(item: Manufacturer) => item.name}
        emptyText={t('listing.manufacturerPickerEmpty')}
      />

      <PickerModal
        visible={f.showYearPicker}
        onClose={() => f.setShowYearPicker(false)}
        title={t('product.selectYear')}
        data={YEAR_OPTIONS}
        onSelect={(item: number) => f.setYear(String(item))}
        selectedId={f.year}
        keyExtractor={(item: number) => String(item)}
        labelExtractor={(item: number) => String(item)}
        emptyText={t('listing.yearPickerEmpty')}
      />

      {f.manufacturerAttrGroups.map((group) => {
        const selected = f.customAttributes[group.slug] ?? [];
        return (
          <PickerModal
            key={group.slug}
            modalKey={group.slug}
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
            keyExtractor={(item: { slug: string }) => item.slug}
            labelExtractor={(item: { label: string }) => item.label}
            emptyText={t('common.noResults')}
          />
        );
      })}
    </>
  );
}
