import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Chip, Text, Textarea, theme } from '@/ui';
import { useZodForm } from '@/ui/form';
import type { ListingRemovalPayload } from '@/lib/api';
import {
  EMPTY_LISTING_REMOVAL,
  REMOVAL_DETAIL_MAX_LENGTH,
  REMOVAL_PLATFORMS,
  SELLER_REMOVAL_REASONS,
  listingRemovalSchema,
  platformLabelKey,
  reasonLabelKey,
  toRemovalPayload,
  type ListingRemovalValues,
  type SellerRemovalAction,
} from './_lib/removal';

const { colors, spacing, typography } = theme;

/** Form kaydırma sınırı: modal kutusu kaydırmaz, küçük ekranda alanlar taşmasın. */
const BODY_MAX_HEIGHT = 420;

/**
 * Satıcıya ilanın NEDEN sahneden indiğini sorar — silme ve pasife alma. Web
 * `ListingRemovalModal` ile aynı kural (`./_lib/removal`). Mutasyonu ÇAĞIRAN
 * taşır (ilanlarım ve düzenleme ekranı ayrı mutasyon kullanır).
 *
 * ⚠️ `onSubmit`'ten ÖNCE modal kapanır: mutasyonun `appAlert`'i ui-native Modal
 * açıkken çıkarsa iOS donar (CLAUDE.md §12).
 */
export function ListingRemovalModal({
  action,
  visible,
  listingTitle,
  onClose,
  onSubmit,
  isPending = false,
}: {
  action: SellerRemovalAction;
  visible: boolean;
  /** Hangi ilanın kaldırıldığı: kalıcı silmede onay cümlesinde, pasife almada başlık satırında. */
  listingTitle?: string;
  onClose: () => void;
  onSubmit: (removal: ListingRemovalPayload) => void;
  isPending?: boolean;
}) {
  const { t } = useTranslation();
  const schema = useMemo(() => listingRemovalSchema(t, action), [t, action]);
  const form = useZodForm(schema, { defaultValues: EMPTY_LISTING_REMOVAL });
  const reason = form.watch('reason');
  const platform = form.watch('platform');
  const detail = form.watch('detail');
  const errors = form.formState.errors;
  const isDelete = action === 'delete';
  const otherPlatform = reason === 'sold_elsewhere' && platform === 'other';

  // Her açılışta temiz form: önceki ilanın seçimi taşınmasın.
  useEffect(() => {
    if (visible) form.reset(EMPTY_LISTING_REMOVAL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, action]);

  const pick = (field: keyof ListingRemovalValues, value: string) =>
    form.setValue(field, value, { shouldValidate: form.formState.isSubmitted });

  const submit = form.handleSubmit((values) => {
    onClose();
    onSubmit(toRemovalPayload(values));
  });

  return (
    <Modal
      isOpen={visible}
      onClose={() => !isPending && onClose()}
      title={isDelete ? t('product.deleteListing') : t('product.deactivateListingFull')}
    >
      <ScrollView
        style={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {listingTitle ? (
          <Text style={styles.listingName} numberOfLines={3}>
            {isDelete ? t('listing.deleteConfirmNamed', { title: listingTitle }) : listingTitle}
          </Text>
        ) : null}
        <Text style={styles.description}>
          {isDelete ? t('product.removal.deleteDescription') : t('product.removal.deactivateDescription')}
        </Text>

        <Text style={styles.label}>{t('product.removal.reasonLabel')}</Text>
        <View style={styles.chipRow}>
          {SELLER_REMOVAL_REASONS[action].map((value) => (
            <Chip
              key={value}
              label={t(reasonLabelKey(value))}
              selected={reason === value}
              variant={reason === value ? 'primary' : 'neutral'}
              onPress={() => pick('reason', value)}
            />
          ))}
        </View>
        {errors.reason?.message ? <Text style={styles.error}>{errors.reason.message}</Text> : null}

        {reason === 'sold_elsewhere' && (
          <>
            <Text style={styles.label}>{t('product.removal.platformLabel')}</Text>
            <View style={styles.chipRow}>
              {REMOVAL_PLATFORMS.map((value) => (
                <Chip
                  key={value}
                  label={t(platformLabelKey(value))}
                  selected={platform === value}
                  variant={platform === value ? 'primary' : 'neutral'}
                  onPress={() => pick('platform', value)}
                />
              ))}
            </View>
            {errors.platform?.message ? <Text style={styles.error}>{errors.platform.message}</Text> : null}
          </>
        )}

        <Textarea
          label={otherPlatform ? t('product.removal.detailRequiredLabel') : t('product.removal.detailLabel')}
          placeholder={
            otherPlatform ? t('product.removal.otherPlatformPlaceholder') : t('product.removal.detailPlaceholder')
          }
          value={detail}
          onChangeText={(text) => pick('detail', text)}
          maxLength={REMOVAL_DETAIL_MAX_LENGTH}
          rows={3}
          error={errors.detail?.message}
          containerStyle={styles.detail}
        />

        <Text style={styles.privacy}>{t('product.removal.privacyNote')}</Text>
      </ScrollView>

      <View style={styles.actions}>
        <Button variant="ghost" title={t('common.cancel')} onPress={onClose} disabled={isPending} />
        <Button
          variant={isDelete ? 'danger' : 'primary'}
          title={isDelete ? t('collection.yesDelete') : t('product.deactivate')}
          isLoading={isPending}
          onPress={submit}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { maxHeight: BODY_MAX_HEIGHT },
  listingName: {
    color: colors.text.heading,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  description: { color: colors.text.body, marginBottom: spacing[4] },
  label: {
    color: colors.text.heading,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] },
  error: { color: colors.danger[600]!, fontSize: typography.fontSize.sm, marginBottom: spacing[3] },
  detail: { marginTop: spacing[1] },
  privacy: { color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: spacing[2] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[3], marginTop: spacing[4] },
});
