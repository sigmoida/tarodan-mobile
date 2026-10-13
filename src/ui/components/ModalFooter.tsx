import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../lib/theme';
import { Button } from './Button';

export interface ModalFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  /** Yıkıcı onay (sil, vazgeç…) → danger. */
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * Web `@tarodan/ui` ModalFooter'ın telefon görünümü: İptal (outline) + ana aksiyon
 * (primary / danger), `flex-col-reverse` → tam genişlik, ana aksiyon ÜSTTE. Bütün diyalog
 * düğmeleri aynı dizilimi kullansın diye tek kaynak.
 *
 * **`isLoading` bilerek YOK (iOS ModalFreeze, CLAUDE.md §12):** web'deki "mutasyon bitene kadar
 * diyaloğu açık tut" kalıbı native'de yapılmaz — bir mutasyonun `appAlert`'i açık bir ui-native
 * Modal'ın üstünde iOS'u dondurur. Kalıp: `onConfirm` içinde doğrulama geçince ÖNCE modalı kapat
 * (`onClose()`), SONRA mutasyonu tetikle; ilerleme/sonuç toast ya da liste durumuyla gösterilir
 * (bkz. `app/offers/_modals/CounterOfferModal.tsx`). `disabled` yalnız form geçersizken içindir.
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel,
  onConfirm,
  cancelLabel,
  confirmLabel,
  destructive = false,
  disabled = false,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.column}>
      <Button
        variant={destructive ? 'danger' : 'primary'}
        title={confirmLabel ?? t('common.save')}
        onPress={onConfirm}
        disabled={disabled}
        fullWidth
      />
      <Button
        variant="outline"
        title={cancelLabel ?? t('common.cancel')}
        onPress={onCancel}
        fullWidth
      />
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    gap: theme.spacing[2],
  },
});
