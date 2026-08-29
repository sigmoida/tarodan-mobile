import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { theme, Text, Button, Modal, Input, Textarea, useModalMessage, ModalMessage } from '@/ui';
import { offersApi } from '@/lib/api';
import { formatPrice } from '../../utils/format';

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
    const minOffer = listPrice * 0.5;
    if (numeric < minOffer) {
      msg.error(t('offer.minimumOfferErrorTl', { amount: minOffer.toLocaleString('tr-TR') }));
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
      msg.error(e?.response?.data?.message || t('product.offerFailed'));
    }
  };

  const numeric = parseFloat(amount) || 0;
  const discount = listPrice > 0 && numeric > 0 ? listPrice - numeric : 0;
  const discountPct = listPrice > 0 && numeric > 0 ? Math.round(((listPrice - numeric) / listPrice) * 100) : 0;

  return (
    <Modal isOpen={visible} onClose={handleClose} title={t('product.makeOffer')}>
      <View>
        <Text style={styles.productTitle} numberOfLines={2}>
          {productTitle}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>{t('product.listPriceLine')}:</Text>
          <Text style={styles.priceValue}>{formatPrice(listPrice)}</Text>
        </View>

        <Input
          testID="offer-amount-input"
          label={`${t('offer.yourOfferAmount')} *`}
          value={amount}
          onChangeText={(v: string) => setAmount(v.replace(/[^\d.,]/g, '').replace(',', '.'))}
          // Maestro: numeric klavyede return tuşu yok → hideKeyboard çalışmıyor.
          // Test modunda default klavye (return var); input zaten rakam-dışını filtreler.
          keyboardType={process.env.EXPO_PUBLIC_MAESTRO === '1' ? 'default' : 'numeric'}
          containerStyle={styles.input}
          placeholder={t('offer.amountPlaceholderExample')}
        />

        {numeric > 0 && discount > 0 ? (
          <View style={styles.discountInfo}>
            <Ionicons name="trending-down" size={16} color={colors.success[600]!} />
            <Text style={styles.discountText}>
              {t('offer.discountBelowListText', { amount: formatPrice(discount), percent: discountPct })}
            </Text>
          </View>
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

        <View style={styles.warning}>
          <Ionicons name="information-circle-outline" size={16} color={colors.info[600]!} />
          <Text style={styles.warningText}>
            {t('offer.offerDeliveryNotice')}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
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
      </View>
      <ModalMessage state={msg.state} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.heading,
    marginBottom: theme.spacing[2],
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
    marginBottom: theme.spacing[3],
  },
  priceLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.heading,
  },
  input: {
    marginBottom: theme.spacing[2.5],
  },
  discountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
    backgroundColor: colors.success[50]!,
    padding: theme.spacing[2],
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing[3],
  },
  discountText: {
    flex: 1,
    fontSize: 12,
    color: colors.success[600]!,
    fontWeight: '600',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[1.5],
    backgroundColor: colors.info[50]!,
    padding: theme.spacing[2.5],
    borderRadius: theme.radius.xl,
    marginTop: theme.spacing[1],
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: colors.info[600]!,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
});
