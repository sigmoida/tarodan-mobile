import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { ButtonRow } from './ButtonRow';

export interface ModalFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  /** Yıkıcı onay (sil, vazgeç…) → danger. */
  destructive?: boolean;
  disabled?: boolean;
  /** Ana aksiyon / İptal düğmesi için test kimliği. */
  confirmTestID?: string;
  cancelTestID?: string;
}

/**
 * Web `@tarodan/ui` ModalFooter (`flex-col-reverse sm:flex-row`): İptal (outline) + ana aksiyon
 * (primary / danger). Etiketler eşit paya sığıyorsa YAN YANA eşit genişlik [İptal][Ana aksiyon];
 * sığmıyorsa alt alta tam genişlik, ana aksiyon ÜSTTE (`ButtonRow stackOrder="reverse"`). Etiket
 * asla sarmaz. Bütün diyalog düğmeleri aynı dizilimi kullansın diye tek kaynak.
 *
 * **`isLoading` bilerek YOK (iOS ModalFreeze, src/ui/CLAUDE.md › iOS modal rule):** web'deki "mutasyon bitene kadar
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
  confirmTestID,
  cancelTestID,
}) => {
  const { t } = useTranslation();
  return (
    <ButtonRow stackOrder="reverse" testID="modal-footer">
      <Button
        key="cancel"
        variant="outline"
        title={cancelLabel ?? t('common.cancel')}
        onPress={onCancel}
        testID={cancelTestID}
      />
      <Button
        key="confirm"
        variant={destructive ? 'danger' : 'primary'}
        title={confirmLabel ?? t('common.save')}
        onPress={onConfirm}
        disabled={disabled}
        testID={confirmTestID}
      />
    </ButtonRow>
  );
};
