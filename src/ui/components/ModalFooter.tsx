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
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Web `@tarodan/ui` ModalFooter'ın telefon görünümü: İptal (outline) + ana aksiyon
 * (primary / danger), `flex-col-reverse` → tam genişlik, ana aksiyon ÜSTTE. Bütün diyalog
 * düğmeleri aynı dizilimi kullansın diye tek kaynak.
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel,
  onConfirm,
  cancelLabel,
  confirmLabel,
  destructive = false,
  isLoading = false,
  disabled = false,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.column}>
      <Button
        variant={destructive ? 'danger' : 'primary'}
        title={confirmLabel ?? t('common.save')}
        onPress={onConfirm}
        isLoading={isLoading}
        disabled={disabled}
        fullWidth
      />
      <Button
        variant="outline"
        title={cancelLabel ?? t('common.cancel')}
        onPress={onCancel}
        disabled={isLoading}
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
