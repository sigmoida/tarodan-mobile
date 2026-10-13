import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme, DateField, RawText, RawTextInput } from '@/ui';
import UpgradeCta from '@/components/UpgradeCta';
import { ListingRemovalModal } from '../ListingRemovalModal';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import { buildConditions, getPackageTierLabel } from '../_lib/constants';
import { TITLE_MAX, DESCRIPTION_MAX, MAX_COLORS } from '../_lib/schema';
import type { ListingFormController } from '../_hooks/useListingForm';

const { colors } = theme;

type SectionProps = { f: ListingFormController };

// ---------------------------------------------------------------------------
// Header + banners (page title, limits, reactivate/deleted panels)
// ---------------------------------------------------------------------------
export function ListingHeaderBanners({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <>
      {!f.isEdit && (
        <>
          <RawText style={styles.pageTitle}>{t('collection.createNewListing')}</RawText>
          <RawText style={styles.pageSubtitle}>{t('listing.createSubtitle')}</RawText>
        </>
      )}

      {/* Listing Limits (create only) */}
      {!f.isEdit && f.limitsLoading ? (
        <View style={styles.limitsPlaceholder}>
          <ActivityIndicator size="small" color={colors.primary[600]!} />
        </View>
      ) : !f.isEdit && f.listingLimits ? (
        <View
          style={[
            styles.limitsCard,
            f.listingLimits.isPremium
              ? styles.limitsPremium
              : f.listingLimits.canCreateListing
              ? styles.limitsOk
              : styles.limitsExceeded,
          ]}
        >
          <View style={styles.limitsRow}>
            <View style={{ flex: 1 }}>
              <RawText
                style={[
                  styles.limitsTitle,
                  f.listingLimits.isPremium
                    ? styles.limitsTitlePremium
                    : f.listingLimits.canCreateListing
                    ? styles.limitsTitleOk
                    : styles.limitsTitleExceeded,
                ]}
              >
                {f.listingLimits.maxListings === -1
                  ? t('listing.currentUnlimited', { count: f.listingLimits.currentCount })
                  : t('listing.quotaLine', {
                      count: f.listingLimits.currentCount,
                      max: f.listingLimits.maxListings,
                    })}
              </RawText>
              {f.listingLimits.remainingListings !== -1 && (
                <RawText style={styles.limitsRemaining}>
                  {t('listing.remainingCount', { count: f.listingLimits.remainingListings })}
                </RawText>
              )}
            </View>
            {!f.listingLimits.canCreateListing && (
              <UpgradeCta>
                <TouchableOpacity style={styles.upgradeButton} onPress={() => router.push('/(tabs)/profile')}>
                  <RawText style={styles.upgradeButtonText}>{t('address.goPremium')}</RawText>
                </TouchableOpacity>
              </UpgradeCta>
            )}
          </View>

          {f.listingLimits.maxListings > 0 && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      100,
                      (f.listingLimits.currentCount / f.listingLimits.maxListings) * 100
                    )}%`,
                  },
                  f.listingLimits.canCreateListing ? styles.progressFillOk : styles.progressFillExceeded,
                ]}
              />
            </View>
          )}
        </View>
      ) : null}

      {/* Reactivation panel (edit, sold) */}
      {f.isEdit && f.status === 'sold' && (
        <View style={[styles.card, styles.reactivateCard]}>
          <RawText style={styles.reactivateTitle}>{t('listing.soldTitle')}</RawText>
          <RawText style={styles.hint}>{t('listing.reactivateHint')}</RawText>
          <RawTextInput
            style={[styles.input, { marginTop: theme.spacing[2.5] }]}
            value={f.reactivateQuantity}
            onChangeText={f.setReactivateQuantity}
            placeholder={t('product.stockQuantity')}
            placeholderTextColor={colors.text.subtle}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={[styles.submitButton, { marginTop: theme.spacing[3] }, f.reactivating && styles.submitButtonDisabled]}
            onPress={f.handleReactivate}
            disabled={f.reactivating}
          >
            {f.reactivating ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <RawText style={styles.submitButtonText}>{t('listing.submitForReview')}</RawText>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Kaldırılmış ürün: düzenlenemez/yeniden açılamaz (yönetici kaldırması) */}
      {f.isEdit && f.status === 'deleted' && (
        <View style={[styles.card, styles.reactivateCard]}>
          <RawText style={styles.reactivateTitle}>{t('listing.removedTitle')}</RawText>
          <RawText style={styles.hint}>{t('listing.removedBody')}</RawText>
        </View>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------
export function ListingImagesSection({ f }: SectionProps) {
  const { t } = useTranslation();
  const maxImages = f.limits?.maxImagesPerListing || 5;
  return (
    <View style={styles.card}>
      <RawText style={styles.sectionHeader}>{t('listing.sectionImages')}</RawText>

      {f.imageKeys.length < maxImages ? (
        <TouchableOpacity style={styles.imageUploadArea} onPress={f.pickImages} disabled={f.uploadingImages}>
          {f.uploadingImages ? (
            <ActivityIndicator size="small" color={colors.primary[600]!} />
          ) : (
            <>
              <RawText style={styles.imageUploadIcon}>📷</RawText>
              <RawText style={styles.imageUploadLabel}>{t('listing.tapToUpload')}</RawText>
            </>
          )}
          <RawText style={styles.imageUploadCount}>
            {t('listing.uploadedCount', { count: f.imageKeys.length, max: maxImages })}
          </RawText>
        </TouchableOpacity>
      ) : (
        <View style={styles.imageMaxReached}>
          <RawText style={styles.imageMaxReachedText}>{t('product.maxImagesReached')}</RawText>
        </View>
      )}

      {f.imageUris.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
          {f.imageUris.map((uri, index) => (
            <View key={`img-${index}`} style={styles.imageThumbWrap}>
              <Image source={{ uri }} style={styles.imageThumb} />
              {index === 0 && (
                <View style={styles.coverBadge}>
                  <RawText style={styles.coverBadgeText}>{t('listing.coverBadge')}</RawText>
                </View>
              )}
              <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => f.removeImage(index)}>
                <RawText style={styles.imageRemoveText}>✕</RawText>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Basic info (title, description)
// ---------------------------------------------------------------------------
export function ListingBasicInfoSection({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <RawText style={styles.sectionHeader}>{t('listing.sectionBasicInfo')}</RawText>

      <RawText style={styles.label}>
        {t('common.title')} <RawText style={styles.required}>*</RawText>
      </RawText>
      <RawTextInput
        style={styles.input}
        value={f.title}
        onChangeText={f.setTitle}
        placeholder={t('product.titlePlaceholder')}
        placeholderTextColor={colors.text.subtle}
        maxLength={TITLE_MAX}
      />
      <RawText style={styles.charCount}>{f.title.length}/{TITLE_MAX}</RawText>

      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>
        {t('common.description')} <RawText style={styles.required}>*</RawText>
      </RawText>
      <RawTextInput
        style={[styles.input, styles.textArea]}
        value={f.description}
        onChangeText={f.setDescription}
        placeholder={t('product.descriptionPlaceholder')}
        placeholderTextColor={colors.text.subtle}
        multiline
        maxLength={DESCRIPTION_MAX}
        textAlignVertical="top"
      />
      <RawText style={styles.charCount}>{f.description.length}/{DESCRIPTION_MAX}</RawText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Product details (category, condition, brand, model, scale, material,
// manufacturer, year, manufacturer-scoped attribute groups)
// ---------------------------------------------------------------------------
export function ListingDetailsSection({ f }: SectionProps) {
  const { t } = useTranslation();
  const conditions = useMemo(() => buildConditions(t), [t]);
  return (
    <View style={styles.card}>
      <RawText style={styles.sectionHeader}>{t('listing.sectionProductDetails')}</RawText>

      <RawText style={styles.label}>
        {t('product.category')} <RawText style={styles.required}>*</RawText>
      </RawText>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => {
          f.setCategorySearch('');
          f.setShowCategoryPicker(true);
        }}
      >
        <RawText style={f.selectedCategory ? styles.pickerValue : styles.pickerPlaceholder}>
          {f.selectedCategory?.name || t('product.selectCategory')}
        </RawText>
        <RawText style={styles.pickerArrow}>›</RawText>
      </TouchableOpacity>

      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>
        {t('product.condition')} <RawText style={styles.required}>*</RawText>
      </RawText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {conditions.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.chip, f.condition === c.value && styles.chipActive]}
            onPress={() => f.setCondition(c.value)}
          >
            <RawText style={[styles.chipText, f.condition === c.value && styles.chipTextActive]}>
              {c.label}
            </RawText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>
        {t('product.brand')} <RawText style={styles.required}>*</RawText>
      </RawText>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => {
          f.setBrandSearch('');
          f.setShowBrandPicker(true);
        }}
        disabled={f.brandsLoading}
      >
        <RawText style={f.selectedBrand ? styles.pickerValue : styles.pickerPlaceholder}>
          {f.brandsLoading ? t('common.loading') : f.selectedBrand?.name || t('product.selectBrand')}
        </RawText>
        <RawText style={styles.pickerArrow}>›</RawText>
      </TouchableOpacity>

      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.model')}</RawText>
      <TouchableOpacity
        style={[styles.pickerButton, !f.brandId && styles.pickerDisabled]}
        onPress={() => f.setShowModelPicker(true)}
        disabled={!f.brandId || f.modelsLoading}
      >
        <RawText style={f.selectedModel ? styles.pickerValue : styles.pickerPlaceholder}>
          {!f.brandId
            ? t('product.selectBrandFirst')
            : f.modelsLoading
            ? t('common.loading')
            : f.models.length === 0
            ? t('product.noModelsForBrand')
            : f.selectedModel?.name || t('product.selectModel')}
        </RawText>
        <RawText style={styles.pickerArrow}>›</RawText>
      </TouchableOpacity>

      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>
        {t('product.scale')} <RawText style={styles.required}>*</RawText>
      </RawText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {f.effectiveScales.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, f.scale === s && styles.chipActive]}
            onPress={() => f.setScale(s)}
          >
            <RawText style={[styles.chipText, f.scale === s && styles.chipTextActive]}>{s}</RawText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>
        {t('product.material')} <RawText style={styles.required}>*</RawText>
      </RawText>
      <TouchableOpacity style={styles.pickerButton} onPress={() => f.setShowMaterialPicker(true)}>
        <RawText style={f.selectedMaterial ? styles.pickerValue : styles.pickerPlaceholder}>
          {f.selectedMaterial?.label || t('product.selectMaterial')}
        </RawText>
        <RawText style={styles.pickerArrow}>›</RawText>
      </TouchableOpacity>

      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>
        {t('product.manufacturer')} <RawText style={styles.required}>*</RawText>
      </RawText>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => {
          f.setManufacturerSearch('');
          f.setShowManufacturerPicker(true);
        }}
      >
        <RawText style={f.selectedManufacturer ? styles.pickerValue : styles.pickerPlaceholder}>
          {f.selectedManufacturer?.name || t('product.selectManufacturer')}
        </RawText>
        <RawText style={styles.pickerArrow}>›</RawText>
      </TouchableOpacity>

      {/* Renk ve kutu durumu sunucuda zorunlu (2026-07-29, `0096579da`) — web ile
          aynı: katalog renkleri çoklu seçim (`colors`), kutu durumu boolean. */}
      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>
        {t('product.color')} <RawText style={styles.required}>*</RawText>
      </RawText>
      <RawText style={styles.hint}>{t('listing.colorLimitHint', { max: MAX_COLORS })}</RawText>
      <View style={styles.chipWrap}>
        {f.colorList.map((c) => {
          const active = f.colors.includes(c.slug);
          return (
            <TouchableOpacity
              key={c.slug}
              testID={`listing-color-${c.slug}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              style={[styles.chip, styles.chipWithDot, active && styles.chipActive]}
              onPress={() => f.toggleColor(c.slug)}
            >
              {c.color ? <View style={[styles.colorDot, { backgroundColor: c.color }]} /> : null}
              <RawText style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</RawText>
            </TouchableOpacity>
          );
        })}
      </View>

      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>
        {t('product.boxedCondition')} <RawText style={styles.required}>*</RawText>
      </RawText>
      <View style={styles.chipRow}>
        {(['boxed', 'unboxed'] as const).map((value) => (
          <TouchableOpacity
            key={value}
            testID={`listing-${value}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: f.isBoxed === value }}
            style={[styles.chip, f.isBoxed === value && styles.chipActive]}
            onPress={() => f.setIsBoxed(value)}
          >
            <RawText style={[styles.chipText, f.isBoxed === value && styles.chipTextActive]}>
              {t(value === 'boxed' ? 'product.boxed' : 'product.unboxed')}
            </RawText>
          </TouchableOpacity>
        ))}
      </View>

      {/* "Ek Özellikler" — genel özel gruplar (ör. Nadirlik/Bulunabilirlik), web
          GlobalAttributesCard ile aynı: tek seçim, zorunlu olan yıldızlı. Yüklenirken
          ve katalog boşken çizilmez; istek düştüyse sebep yazılır (satıcı zorunlu
          alanın neden yok olduğunu sunucu 400'ünden öğrenmemeli). */}
      {f.globalAttrGroups.length > 0 ? (
        <>
          <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.additionalDetails')}</RawText>
          <RawText style={styles.hint}>{t('product.globalAttrsHint')}</RawText>
          {f.globalAttrGroups.map((group) => (
            <View key={group.slug} style={{ marginTop: theme.spacing[2] }}>
              <RawText style={styles.label}>
                {group.name} {group.isRequired ? <RawText style={styles.required}>*</RawText> : null}
              </RawText>
              <View style={styles.chipWrap}>
                {group.attributes.map((attr) => {
                  const active = f.globalAttributes[group.slug]?.[0] === attr.slug;
                  return (
                    <TouchableOpacity
                      key={attr.slug}
                      testID={`listing-attr-${group.slug}-${attr.slug}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => f.setGlobalAttribute(group.slug, attr.slug)}
                    >
                      <RawText style={[styles.chipText, active && styles.chipTextActive]}>{attr.label}</RawText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </>
      ) : f.globalAttrGroupsFailed ? (
        <RawText style={[styles.hint, { color: colors.danger[600]!, marginTop: theme.spacing[4] }]}>
          {t('product.optionsLoadFailed')}
        </RawText>
      ) : null}

      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.modelCodeLabel')}</RawText>
      <RawTextInput
        style={styles.input}
        value={f.modelCode}
        onChangeText={f.setModelCode}
        placeholder={t('product.modelCodePlaceholder')}
        placeholderTextColor={colors.text.subtle}
        maxLength={100}
      />

      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.releaseYear')}</RawText>
      <TouchableOpacity style={styles.pickerButton} onPress={() => f.setShowYearPicker(true)}>
        <RawText style={f.year ? styles.pickerValue : styles.pickerPlaceholder}>
          {f.year || t('product.selectYear')}
        </RawText>
        <RawText style={styles.pickerArrow}>›</RawText>
      </TouchableOpacity>

      {/* Manufacturer-scoped extra attribute groups */}
      {f.manufacturerAttrGroups.map((group) => {
        const selected = f.customAttributes[group.slug] ?? [];
        const summary =
          selected.length === 0
            ? t('product.selectAttribute', { name: group.name })
            : selected.length === 1
            ? group.attributes.find((a) => a.slug === selected[0])?.label ??
              t('listing.attrGroupSelectedCount', { count: 1 })
            : t('listing.attrGroupSelectedCount', { count: selected.length });
        return (
          <View key={group.slug}>
            <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>{group.name}</RawText>
            <TouchableOpacity style={styles.pickerButton} onPress={() => f.setShowAttrGroupPicker(group.slug)}>
              <RawText style={selected.length > 0 ? styles.pickerValue : styles.pickerPlaceholder}>{summary}</RawText>
              <RawText style={styles.pickerArrow}>›</RawText>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Options (trade, set/bundle, pre-order, status)
// ---------------------------------------------------------------------------
export function ListingOptionsSection({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <RawText style={styles.sectionHeader}>{t('listing.sectionOptions')}</RawText>

      <View
        style={[
          styles.toggleRow,
          f.limits?.canTrade ? styles.toggleRowEnabled : styles.toggleRowDisabled,
        ]}
      >
        <View style={{ flex: 1 }}>
          <RawText style={styles.toggleLabel}>{t('product.tradeEnabled')}</RawText>
          <RawText style={styles.toggleHint}>
            {f.limits?.canTrade
              ? t('product.tradeKeepsOpenForTrade')
              : CAN_BUY_DIGITAL
              ? t('product.tradeRequiresPremium')
              : t('membership.featureUnavailableOnAccount')}
          </RawText>
        </View>
        {f.limits?.canTrade ? (
          <Switch
            value={f.isTradeEnabled}
            onValueChange={f.setIsTradeEnabled}
            trackColor={{ false: colors.gray[300], true: colors.warning[500]! }}
            thumbColor={colors.white}
          />
        ) : (
          <UpgradeCta>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <RawText style={styles.upgradeLinkText}>{t('product.upgradeArrow')}</RawText>
            </TouchableOpacity>
          </UpgradeCta>
        )}
      </View>

      <View style={[styles.toggleRow, styles.toggleRowDisabled, { marginTop: theme.spacing[3] }]}>
        <View style={{ flex: 1 }}>
          <RawText style={styles.toggleLabel}>{t('product.setBundle')}</RawText>
          <RawText style={styles.toggleHint}>{t('product.setBundleHelper')}</RawText>
        </View>
        <Switch
          value={f.isSet}
          onValueChange={f.setIsSet}
          trackColor={{ false: colors.gray[300], true: colors.info[600]! }}
          thumbColor={colors.white}
        />
      </View>

      {f.isSet && (
        <View style={{ marginTop: theme.spacing[3] }}>
          <RawText style={styles.label}>{t('product.setPieceCount')}</RawText>
          <RawTextInput
            style={styles.input}
            value={f.bundleSize}
            onChangeText={(v) => f.setBundleSize(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder={t('product.setPiecePlaceholder')}
            placeholderTextColor={colors.gray[400]}
          />
          <RawText style={styles.toggleHint}>{t('product.setSizeHelper')}</RawText>
        </View>
      )}

      {/* Pre-order (edit only) */}
      {f.isEdit && (
        <View style={[styles.toggleRow, styles.toggleRowDisabled, { marginTop: theme.spacing[3] }]}>
          <View style={{ flex: 1 }}>
            <RawText style={styles.toggleLabel}>{t('product.preOrder')}</RawText>
            <RawText style={styles.toggleHint}>{t('listing.preorderNotInHandHint')}</RawText>
          </View>
          <Switch
            value={f.isPreorder}
            onValueChange={f.setIsPreorder}
            trackColor={{ false: colors.gray[300], true: colors.primary[600]! }}
            thumbColor={colors.white}
          />
        </View>
      )}

      {/* Status (edit only, active/inactive) */}
      {f.isEdit && (f.status === 'active' || f.status === 'inactive') && (
        <View style={{ marginTop: theme.spacing[4] }}>
          <RawText style={styles.label}>{t('listing.statusLabel')}</RawText>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, f.status === 'active' && styles.chipActive]}
              onPress={() => f.setStatus('active')}
            >
              <RawText style={[styles.chipText, f.status === 'active' && styles.chipTextActive]}>
                {t('common.active')}
              </RawText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, f.status === 'inactive' && styles.chipActive]}
              onPress={() => f.setStatus('inactive')}
            >
              <RawText style={[styles.chipText, f.status === 'inactive' && styles.chipTextActive]}>
                {t('common.inactive')}
              </RawText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pricing (price, quantity, discount, commission preview)
// ---------------------------------------------------------------------------
export function ListingPricingSection({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <RawText style={styles.sectionHeader}>{t('listing.sectionPricing')}</RawText>

      <RawText style={styles.label}>
        {t('listing.priceFieldLabel')} <RawText style={styles.required}>*</RawText>
      </RawText>
      <RawTextInput
        style={styles.input}
        value={f.price}
        onChangeText={f.setPrice}
        placeholder="0.00"
        placeholderTextColor={colors.text.subtle}
        keyboardType="decimal-pad"
      />

      <RawText style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.stockQuantity')}</RawText>
      <RawTextInput
        style={styles.input}
        value={f.quantity}
        onChangeText={f.setQuantity}
        placeholder={f.isEdit ? t('membership.unlimited') : '1'}
        placeholderTextColor={colors.text.subtle}
        keyboardType="number-pad"
      />
      <RawText style={styles.hint}>
        {f.isEdit ? t('product.leaveEmptyUnlimitedStock') : t('product.quantityDefaultHint')}
      </RawText>
      {f.isEdit && f.reservedQty > 0 && (
        <RawText style={styles.reservedHint}>
          {t('listing.reservedHint', {
            reserved: f.reservedQty,
            available: Math.max(0, (Number(f.quantity) || 0) - f.reservedQty),
          })}
        </RawText>
      )}

      {/* İndirim — create'te de gösterilir. `POST /products` indirim alanlarını
          kabul ediyor (delta 18 §2b) ve `buildSalePayload` zaten create yolunda
          da çağrılıyordu; yalnız bu kapı yüzünden satıcı ilanı önce açıp sonra
          düzenlemeden indirim eklemek zorunda kalıyordu. */}
      <View style={styles.discountBox}>
          <RawText style={styles.label}>{t('product.discountedPrice')} (TL)</RawText>
          <RawTextInput
            style={styles.input}
            value={f.salePrice}
            onChangeText={f.setSalePrice}
            placeholder={t('listing.salePricePlaceholder')}
            placeholderTextColor={colors.text.subtle}
            keyboardType="decimal-pad"
          />
          {f.discountPercent > 0 && (
            <RawText style={styles.discountPercent}>
              {t('listing.discountPercentLabel', { percent: f.discountPercent })}
            </RawText>
          )}
          <View style={{ marginTop: theme.spacing[3] }}>
            <DateField
              label={t('listing.saleStartLabel')}
              value={f.saleStartDate}
              onChange={f.setSaleStartDate}
              placeholder={t('auth.birthDatePlaceholder')}
            />
          </View>
          <DateField
            label={t('listing.saleEndLabel')}
            value={f.saleEndDate}
            onChange={f.setSaleEndDate}
            placeholder={t('auth.birthDatePlaceholder')}
            minimumDate={f.saleStartDate ? new Date(f.saleStartDate) : undefined}
          />
      </View>

      {/* Commission preview */}
      {(f.commissionLoading || f.commissionPreview) && (
        <View style={styles.commissionCard}>
          <RawText style={styles.commissionTitle}>{t('product.estimatedPerSale')}</RawText>
          {f.commissionLoading ? (
            <ActivityIndicator size="small" color={colors.text.subtle} style={{ marginTop: theme.spacing[1] }} />
          ) : f.commissionPreview ? (
            <View style={styles.commissionRow}>
              <RawText style={styles.commissionFee}>
                {t('listing.platformFeeLine', {
                  amount: formatPrice(f.commissionPreview.sellerFeeAmount),
                })}
              </RawText>
              <RawText style={styles.commissionNet}>
                {t('listing.netEarningLine', {
                  amount: formatPrice(f.commissionPreview.sellerNetAmount),
                })}
              </RawText>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shipping package tier
// ---------------------------------------------------------------------------

/**
 * Kargo paket boyutu — üç kart, sunucu tarifesinden (`GET /shipping/package-tiers`).
 *
 * ⚠️ BAĞLAYICI (doküman 14 §1): mobil arayüzde **desi hiç görünmez**. Tarife
 * `billableDesi` / `minDesi` / `maxDesi` döndürüyor; hiçbiri render edilmez.
 * Kart üzerinde tutar da yazmıyoruz: `amount` kademenin TAM kargo bedeli ama
 * alıcı/satıcı payı kategori bazlı ve adminden geliyor (canlıda 50/50) —
 * istemcinin gösterebileceği doğru tek rakam, aşağıdaki net kazanç önizlemesi.
 */
export function ListingShippingSection({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <RawText style={styles.sectionHeader}>{t('listing.sectionShipping')}</RawText>

      <RawText style={styles.label}>
        {t('listing.packageSizeLabel')} <RawText style={styles.required}>*</RawText>
      </RawText>

      {f.packageTiersLoading ? (
        <ActivityIndicator size="small" color={colors.text.subtle} />
      ) : f.packageTiersError || f.packageTiers.length === 0 ? (
        <RawText style={styles.hint}>{t('listing.packageTiersError')}</RawText>
      ) : (
        <>
          <View style={styles.tierRow}>
            {f.packageTiers.map((tier) => {
              const selected = f.shippingPackageTier === tier.code;
              const sample = [tier.sampleWidth, tier.sampleHeight, tier.sampleLength];
              const hasSample = sample.every((v) => v != null);
              return (
                <TouchableOpacity
                  key={tier.code}
                  testID={`package-tier-${tier.code}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.tierCard, selected && styles.tierCardActive]}
                  onPress={() => f.setShippingPackageTier(tier.code)}
                >
                  <RawText style={[styles.tierLabel, selected && styles.tierLabelActive]}>
                    {getPackageTierLabel(tier.code, tier.label, t)}
                  </RawText>
                  {/* Örnek ölçü sunucuda bugün boş — geldiği gün görünür. */}
                  {hasSample && (
                    <RawText style={[styles.tierSample, selected && styles.tierLabelActive]}>
                      {sample.join(' × ')} cm
                    </RawText>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <RawText style={styles.hint}>{t('listing.packageTiersHint')}</RawText>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Submit + delete
// ---------------------------------------------------------------------------
export function ListingSubmitRow({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.submitRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <RawText style={styles.cancelButtonText}>{t('common.cancel')}</RawText>
        </TouchableOpacity>
        <TouchableOpacity
          testID="listing-submit-button"
          style={[styles.submitButton, (f.isSubmitting || f.uploadingImages) && styles.submitButtonDisabled]}
          onPress={f.handleSubmit}
          disabled={f.isSubmitting || f.uploadingImages}
        >
          {f.isSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <RawText style={styles.submitButtonText}>
              {f.uploadingImages
                ? t('product.saveWhileUploading')
                : f.isEdit
                  ? t('product.saveChanges')
                  : t('product.createListing')}
            </RawText>
          )}
        </TouchableOpacity>
      </View>

      {/* Delete (edit only) */}
      {f.isEdit && (
        <TouchableOpacity style={styles.deleteButton} onPress={f.handleDelete} disabled={f.isSubmitting}>
          <Ionicons name="trash-outline" size={18} color={colors.danger[600]!} />
          <RawText style={styles.deleteButtonText}>{t('product.deleteListing')}</RawText>
        </TouchableOpacity>
      )}
      {f.isEdit && (
        <ListingRemovalModal
          action="delete"
          visible={f.removalOpen}
          listingTitle={f.title}
          onClose={f.closeRemoval}
          onSubmit={f.deleteWithReason}
        />
      )}
    </>
  );
}
