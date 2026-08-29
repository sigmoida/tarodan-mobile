import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme, DateField } from '@/ui';

import { styles } from '../_lib/styles';
import { buildConditions, getPackageTierLabel } from '../_lib/constants';
import type { ListingFormController } from '../_hooks/useListingForm';

const { colors } = theme;

type SectionProps = { f: ListingFormController };

// ---------------------------------------------------------------------------
// Header + banners (page title, IBAN prompt, limits, reactivate/deleted panels)
// ---------------------------------------------------------------------------
export function ListingHeaderBanners({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <>
      {!f.isEdit && (
        <>
          <Text style={styles.pageTitle}>{t('collection.createNewListing')}</Text>
          <Text style={styles.pageSubtitle}>{t('listing.createSubtitle')}</Text>
        </>
      )}

      {/* Bank Account Banner (create only) */}
      {!f.isEdit && !f.bankAccountQuery.isLoading && !f.hasBankAccount && (
        <View style={styles.ibanBanner}>
          <Text style={styles.ibanBannerTitle}>{t('listing.bankAccountBannerTitle')}</Text>
          <Text style={styles.ibanBannerBody}>{t('listing.bankAccountBannerBody')}</Text>
          <TouchableOpacity
            style={styles.ibanBannerButton}
            onPress={() => router.push('/settings/bank-account')}
          >
            <Text style={styles.ibanBannerButtonText}>{t('listing.addIban')}</Text>
          </TouchableOpacity>
        </View>
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
              <Text
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
              </Text>
              {f.listingLimits.remainingListings !== -1 && (
                <Text style={styles.limitsRemaining}>
                  {t('listing.remainingCount', { count: f.listingLimits.remainingListings })}
                </Text>
              )}
            </View>
            {!f.listingLimits.canCreateListing && (
              <TouchableOpacity style={styles.upgradeButton} onPress={() => router.push('/(tabs)/profile')}>
                <Text style={styles.upgradeButtonText}>{t('address.goPremium')}</Text>
              </TouchableOpacity>
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
          <Text style={styles.reactivateTitle}>{t('listing.soldTitle')}</Text>
          <Text style={styles.hint}>{t('listing.reactivateHint')}</Text>
          <TextInput
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
              <Text style={styles.submitButtonText}>{t('listing.submitForReview')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Kaldırılmış ürün: düzenlenemez/yeniden açılamaz (yönetici kaldırması) */}
      {f.isEdit && f.status === 'deleted' && (
        <View style={[styles.card, styles.reactivateCard]}>
          <Text style={styles.reactivateTitle}>{t('listing.removedTitle')}</Text>
          <Text style={styles.hint}>{t('listing.removedBody')}</Text>
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
      <Text style={styles.sectionHeader}>{t('listing.sectionImages')}</Text>

      {f.imageKeys.length < maxImages ? (
        <TouchableOpacity style={styles.imageUploadArea} onPress={f.pickImages} disabled={f.uploadingImages}>
          {f.uploadingImages ? (
            <ActivityIndicator size="small" color={colors.primary[600]!} />
          ) : (
            <>
              <Text style={styles.imageUploadIcon}>📷</Text>
              <Text style={styles.imageUploadLabel}>{t('listing.tapToUpload')}</Text>
            </>
          )}
          <Text style={styles.imageUploadCount}>
            {t('listing.uploadedCount', { count: f.imageKeys.length, max: maxImages })}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.imageMaxReached}>
          <Text style={styles.imageMaxReachedText}>{t('product.maxImagesReached')}</Text>
        </View>
      )}

      {f.imageUris.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
          {f.imageUris.map((uri, index) => (
            <View key={`img-${index}`} style={styles.imageThumbWrap}>
              <Image source={{ uri }} style={styles.imageThumb} />
              {index === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>{t('listing.coverBadge')}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => f.removeImage(index)}>
                <Text style={styles.imageRemoveText}>✕</Text>
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
      <Text style={styles.sectionHeader}>{t('listing.sectionBasicInfo')}</Text>

      <Text style={styles.label}>
        {t('common.title')} <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        value={f.title}
        onChangeText={f.setTitle}
        placeholder={t('product.titlePlaceholder')}
        placeholderTextColor={colors.text.subtle}
        maxLength={200}
      />
      <Text style={styles.charCount}>{f.title.length}/200</Text>

      <Text style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('common.description')}</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={f.description}
        onChangeText={f.setDescription}
        placeholder={t('product.descriptionPlaceholder')}
        placeholderTextColor={colors.text.subtle}
        multiline
        maxLength={5000}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{f.description.length}/5000</Text>
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
      <Text style={styles.sectionHeader}>{t('listing.sectionProductDetails')}</Text>

      <Text style={styles.label}>
        {t('product.category')} <Text style={styles.required}>*</Text>
      </Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => {
          f.setCategorySearch('');
          f.setShowCategoryPicker(true);
        }}
      >
        <Text style={f.selectedCategory ? styles.pickerValue : styles.pickerPlaceholder}>
          {f.selectedCategory?.name || t('product.selectCategory')}
        </Text>
        <Text style={styles.pickerArrow}>›</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: theme.spacing[4] }]}>
        {t('product.condition')} <Text style={styles.required}>*</Text>
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {conditions.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.chip, f.condition === c.value && styles.chipActive]}
            onPress={() => f.setCondition(c.value)}
          >
            <Text style={[styles.chipText, f.condition === c.value && styles.chipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.brand')}</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => {
          f.setBrandSearch('');
          f.setShowBrandPicker(true);
        }}
        disabled={f.brandsLoading}
      >
        <Text style={f.selectedBrand ? styles.pickerValue : styles.pickerPlaceholder}>
          {f.brandsLoading ? t('common.loading') : f.selectedBrand?.name || t('product.selectBrand')}
        </Text>
        <Text style={styles.pickerArrow}>›</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.model')}</Text>
      <TouchableOpacity
        style={[styles.pickerButton, !f.brandId && styles.pickerDisabled]}
        onPress={() => f.setShowModelPicker(true)}
        disabled={!f.brandId || f.modelsLoading}
      >
        <Text style={f.selectedModel ? styles.pickerValue : styles.pickerPlaceholder}>
          {!f.brandId
            ? t('product.selectBrandFirst')
            : f.modelsLoading
            ? t('common.loading')
            : f.models.length === 0
            ? t('product.noModelsForBrand')
            : f.selectedModel?.name || t('product.selectModel')}
        </Text>
        <Text style={styles.pickerArrow}>›</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.scale')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {f.effectiveScales.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, f.scale === s && styles.chipActive]}
            onPress={() => f.setScale(s)}
          >
            <Text style={[styles.chipText, f.scale === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.material')}</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => f.setShowMaterialPicker(true)}>
        <Text style={f.selectedMaterial ? styles.pickerValue : styles.pickerPlaceholder}>
          {f.selectedMaterial?.label || t('product.selectMaterial')}
        </Text>
        <Text style={styles.pickerArrow}>›</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.manufacturer')}</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => {
          f.setManufacturerSearch('');
          f.setShowManufacturerPicker(true);
        }}
      >
        <Text style={f.selectedManufacturer ? styles.pickerValue : styles.pickerPlaceholder}>
          {f.selectedManufacturer?.name || t('product.selectManufacturer')}
        </Text>
        <Text style={styles.pickerArrow}>›</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.modelCodeLabel')}</Text>
      <TextInput
        style={styles.input}
        value={f.modelCode}
        onChangeText={f.setModelCode}
        placeholder={t('product.modelCodePlaceholder')}
        placeholderTextColor={colors.text.subtle}
        maxLength={100}
      />

      <Text style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.releaseYear')}</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => f.setShowYearPicker(true)}>
        <Text style={f.year ? styles.pickerValue : styles.pickerPlaceholder}>
          {f.year || t('product.selectYear')}
        </Text>
        <Text style={styles.pickerArrow}>›</Text>
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
            <Text style={[styles.label, { marginTop: theme.spacing[4] }]}>{group.name}</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => f.setShowAttrGroupPicker(group.slug)}>
              <Text style={selected.length > 0 ? styles.pickerValue : styles.pickerPlaceholder}>{summary}</Text>
              <Text style={styles.pickerArrow}>›</Text>
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
      <Text style={styles.sectionHeader}>{t('listing.sectionOptions')}</Text>

      <View
        style={[
          styles.toggleRow,
          f.limits?.canTrade ? styles.toggleRowEnabled : styles.toggleRowDisabled,
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleLabel}>{t('product.tradeEnabled')}</Text>
          <Text style={styles.toggleHint}>
            {f.limits?.canTrade
              ? t('product.tradeKeepsOpenForTrade')
              : t('product.tradeRequiresPremium')}
          </Text>
        </View>
        {f.limits?.canTrade ? (
          <Switch
            value={f.isTradeEnabled}
            onValueChange={f.setIsTradeEnabled}
            trackColor={{ false: colors.gray[300], true: colors.warning[500]! }}
            thumbColor={colors.white}
          />
        ) : (
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.upgradeLinkText}>{t('product.upgradeArrow')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.toggleRow, styles.toggleRowDisabled, { marginTop: theme.spacing[3] }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleLabel}>{t('product.setBundle')}</Text>
          <Text style={styles.toggleHint}>{t('product.setBundleHelper')}</Text>
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
          <Text style={styles.label}>{t('product.setPieceCount')}</Text>
          <TextInput
            style={styles.input}
            value={f.bundleSize}
            onChangeText={(v) => f.setBundleSize(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder={t('product.setPiecePlaceholder')}
            placeholderTextColor={colors.gray[400]}
          />
          <Text style={styles.toggleHint}>{t('product.setSizeHelper')}</Text>
        </View>
      )}

      {/* Pre-order (edit only) */}
      {f.isEdit && (
        <View style={[styles.toggleRow, styles.toggleRowDisabled, { marginTop: theme.spacing[3] }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>{t('product.preOrder')}</Text>
            <Text style={styles.toggleHint}>{t('listing.preorderNotInHandHint')}</Text>
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
          <Text style={styles.label}>{t('listing.statusLabel')}</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, f.status === 'active' && styles.chipActive]}
              onPress={() => f.setStatus('active')}
            >
              <Text style={[styles.chipText, f.status === 'active' && styles.chipTextActive]}>
                {t('common.active')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, f.status === 'inactive' && styles.chipActive]}
              onPress={() => f.setStatus('inactive')}
            >
              <Text style={[styles.chipText, f.status === 'inactive' && styles.chipTextActive]}>
                {t('common.inactive')}
              </Text>
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
      <Text style={styles.sectionHeader}>{t('listing.sectionPricing')}</Text>

      <Text style={styles.label}>
        {t('listing.priceFieldLabel')} <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        value={f.price}
        onChangeText={f.setPrice}
        placeholder="0.00"
        placeholderTextColor={colors.text.subtle}
        keyboardType="decimal-pad"
      />

      <Text style={[styles.label, { marginTop: theme.spacing[4] }]}>{t('product.stockQuantity')}</Text>
      <TextInput
        style={styles.input}
        value={f.quantity}
        onChangeText={f.setQuantity}
        placeholder={f.isEdit ? t('membership.unlimited') : '1'}
        placeholderTextColor={colors.text.subtle}
        keyboardType="number-pad"
      />
      <Text style={styles.hint}>
        {f.isEdit ? t('product.leaveEmptyUnlimitedStock') : t('product.quantityDefaultHint')}
      </Text>
      {f.isEdit && f.reservedQty > 0 && (
        <Text style={styles.reservedHint}>
          {t('listing.reservedHint', {
            reserved: f.reservedQty,
            available: Math.max(0, (Number(f.quantity) || 0) - f.reservedQty),
          })}
        </Text>
      )}

      {/* İndirim — create'te de gösterilir. `POST /products` indirim alanlarını
          kabul ediyor (delta 18 §2b) ve `buildSalePayload` zaten create yolunda
          da çağrılıyordu; yalnız bu kapı yüzünden satıcı ilanı önce açıp sonra
          düzenlemeden indirim eklemek zorunda kalıyordu. */}
      <View style={styles.discountBox}>
          <Text style={styles.label}>{t('product.discountedPrice')} (₺)</Text>
          <TextInput
            style={styles.input}
            value={f.salePrice}
            onChangeText={f.setSalePrice}
            placeholder={t('listing.salePricePlaceholder')}
            placeholderTextColor={colors.text.subtle}
            keyboardType="decimal-pad"
          />
          {f.discountPercent > 0 && (
            <Text style={styles.discountPercent}>
              {t('listing.discountPercentLabel', { percent: f.discountPercent })}
            </Text>
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
          <Text style={styles.commissionTitle}>{t('product.estimatedPerSale')}</Text>
          {f.commissionLoading ? (
            <ActivityIndicator size="small" color={colors.text.subtle} style={{ marginTop: theme.spacing[1] }} />
          ) : f.commissionPreview ? (
            <View style={styles.commissionRow}>
              <Text style={styles.commissionFee}>
                {t('listing.platformFeeLine', {
                  amount: (f.commissionPreview.sellerFeeAmount ?? 0).toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                })}
              </Text>
              <Text style={styles.commissionNet}>
                {t('listing.netEarningLine', {
                  amount: (f.commissionPreview.sellerNetAmount ?? 0).toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                })}
              </Text>
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
      <Text style={styles.sectionHeader}>{t('listing.sectionShipping')}</Text>

      <Text style={styles.label}>
        {t('listing.packageSizeLabel')} <Text style={styles.required}>*</Text>
      </Text>

      {f.packageTiersLoading ? (
        <ActivityIndicator size="small" color={colors.text.subtle} />
      ) : f.packageTiersError || f.packageTiers.length === 0 ? (
        <Text style={styles.hint}>{t('listing.packageTiersError')}</Text>
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
                  <Text style={[styles.tierLabel, selected && styles.tierLabelActive]}>
                    {getPackageTierLabel(tier.code, tier.label, t)}
                  </Text>
                  {/* Örnek ölçü sunucuda bugün boş — geldiği gün görünür. */}
                  {hasSample && (
                    <Text style={[styles.tierSample, selected && styles.tierLabelActive]}>
                      {sample.join(' × ')} cm
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.hint}>{t('listing.packageTiersHint')}</Text>
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
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
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
            <Text style={styles.submitButtonText}>
              {f.uploadingImages
                ? t('product.saveWhileUploading')
                : f.isEdit
                  ? t('product.saveChanges')
                  : t('product.createListing')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Delete (edit only) */}
      {f.isEdit && (
        <TouchableOpacity style={styles.deleteButton} onPress={f.handleDelete} disabled={f.isSubmitting}>
          <Ionicons name="trash-outline" size={18} color={colors.danger[600]!} />
          <Text style={styles.deleteButtonText}>{t('product.deleteListing')}</Text>
        </TouchableOpacity>
      )}
    </>
  );
}
