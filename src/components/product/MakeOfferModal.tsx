import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { theme, Text, Alert, Button, Chip, Modal, Input, Textarea, useModalMessage, ModalMessage, ButtonRow } from '@/ui';
import { offersApi } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { IS_MAESTRO } from '@/config/maestro';
import { formatPrice } from '../../utils/format';
import { MIN_OFFER_RATIO, offerPresets } from './offerPresets';

const { colors } = theme;

interface MakeOfferModalProps {
  visible: boolean;
  onDismiss: () => void;
  productId: string;
  productTitle: string;
  /** Liste fiyatı (satıcının istediği fiyat) — kullanıcının altında teklif vermesi beklenir. */
  listPrice: number;
  /** Başarılı gönderim sonrası callback (örn. snackbar). */
  onSuccess?: () => void;
}

/**
 * Ürün detayında "Teklif Ver" butonuna tıklayınca açılan modal.
 * Web `apps/web/src/app/listings/[id]/page.tsx:424` ile aynı `offersApi.create({ productId, amount, message })`.
 */
export default function MakeOfferModal({
  visible,
  onDismiss,
  productId,
  productTitle,
  listPrice,
  onSuccess,
}: MakeOfferModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const msg = useModalMessage();

  const createOfferMutation = useMutation({
    mutationFn: () =>
      offersApi.create({
        productId,
        amount: parseFloat(amount),
        message: message.trim() || undefined,
      }),
  });

  const handleClose = () => {
    msg.clear();
    setAmount('');
    setMessage('');
    createOfferMutation.reset();
    onDismiss();
  };

  const handleSubmit = async () => {
    msg.clear();
    const numeric = parseFloat(amount);
    if (!numeric || numeric <= 0) {
      msg.error(t('offer.enterPositiveAmount'));
      return;
    }
    // API kuralı: minimum teklif fiyatın %50'si (web paritesi) — yoksa ham 400 dönüyordu.
    const minOffer = listPrice * MIN_OFFER_RATIO;
    if (numeric < minOffer) {
      msg.error(t('offer.minimumOfferErrorTl', { amount: formatPrice(minOffer) }));
      return;
    }
    if (numeric >= listPrice) {
      msg.error(t('offer.aboveListPriceError'));
      return;
    }
    try {
      await createOfferMutation.mutateAsync();
      onSuccess?.();
      handleClose();
    } catch (e: any) {
      msg.error(apiErrorMessage(e, t('product.offerFailed')));
    }
  };

  const numeric = parseFloat(amount) || 0;
  const discount = listPrice > 0 && numeric > 0 ? listPrice - numeric : 0;
  const discountPct = listPrice > 0 && numeric > 0 ? Math.round(((listPrice - numeric) / listPrice) * 100) : 0;
  // Hızlı teklif: liste fiyatından −%5/−%10/−%15 (tam TL); serbest giriş de açık.
  const presets = offerPresets(listPrice);

  return (
    <Modal isOpen={visible} onClose={handleClose} title={t('product.makeOffer')}>
      <View>
        <Text variant="bodySm" weight="semibold" numberOfLines={2} style={styles.productTitle}>
          {productTitle}
        </Text>
        <View style={styles.priceRow}>
          <Text variant="bodySm" tone="muted">
            {t('product.listPriceLine')}:
          </Text>
          <Text variant="body" weight="bold">
            {formatPrice(listPrice)}
          </Text>
        </View>

        <Input
          testID="offer-amount-input"
          label={`${t('offer.yourOfferAmount')} *`}
          value={amount}
          onChangeText={(v: string) => setAmount(v.replace(/[^\d.,]/g, '').replace(',', '.'))}
          // Maestro: numeric klavyede return tuşu yok → hideKeyboard çalışmıyor.
          // Test modunda default klavye (return var); input zaten rakam-dışını filtreler.
          keyboardType={IS_MAESTRO ? 'default' : 'numeric'}
          containerStyle={styles.input}
          placeholder={t('offer.amountPlaceholderExample')}
        />

        {presets.length > 0 ? (
          <View style={styles.presets} accessibilityLabel={t('offer.presetsLabel')}>
            {presets.map((p) => (
              <Chip
                key={p.percent}
                testID={`offer-preset-${p.percent}`}
                label={`${t('offer.presetDiscount', { percent: p.percent })} · ${formatPrice(p.amount)}`}
                selected={numeric === p.amount}
                onPress={() => {
                  msg.clear();
                  setAmount(String(p.amount));
                }}
              />
            ))}
          </View>
        ) : null}

        {numeric > 0 && discount > 0 ? (
          <Alert variant="success" style={styles.input}>
            {t('offer.discountBelowListText', { amount: formatPrice(discount), percent: discountPct })}
          </Alert>
        ) : null}

        <Textarea
          label={t('offer.offerMessage')}
          value={message}
          onChangeText={setMessage}
          rows={3}
          maxLength={500}
          containerStyle={styles.input}
          placeholder={t('product.offerMessagePlaceholder')}
        />

        <Alert variant="info">{t('offer.offerDeliveryNotice')}</Alert>
      </View>

      <ButtonRow style={{ marginTop: theme.spacing[3] }}>
        <Button
          variant="ghost"
          title={t('listing.dismiss')}
          onPress={handleClose}
          disabled={createOfferMutation.isPending}
        />
        <Button
          testID="offer-submit-button"
          variant="primary"
          title={t('offer.sendOffer')}
          onPress={handleSubmit}
          isLoading={createOfferMutation.isPending}
          disabled={!numeric || createOfferMutation.isPending}
        />
      </ButtonRow>
      <ModalMessage state={msg.state} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  productTitle: { marginBottom: theme.spacing[2] },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
    marginBottom: theme.spacing[3],
  },
  input: { marginBottom: theme.spacing[2.5] },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], marginBottom: theme.spacing[2.5] },
});
