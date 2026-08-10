import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Modal, Text, theme } from '@/ui';
import { useOrderShipment } from '@/hooks/useOrderShipment';
import { deriveShipmentView } from '@/lib/shipping/tracking';
import { styles } from '../_lib/styles';
import type { SaleActionsController } from '../_hooks/useSaleActions';

/**
 * Kargoya verme onay diyaloğu — numara artık sunucu üretiyor, elle giriş yok.
 *
 * Şubede verilecek numara İÇ REFERANSTIR (`trackingNumber`, `PKG-…`), gerçek
 * Sürat kodu değil — Sürat kodu şube kabulünden SONRA doluyor. Yönerge metni
 * ("bu numarayı veriniz") yalnız gösterilecek bir numara varken anlamlı.
 */
export function ShipDialog({ actions }: { actions: SaleActionsController }) {
  const { t } = useTranslation();
  const { shipDialog, setShipDialog, handleShip, updateStatusMutation } = actions;
  const { shipment } = useOrderShipment(shipDialog.order?.id);
  const { reference } = deriveShipmentView(shipment);

  return (
    <Modal
      isOpen={shipDialog.visible}
      onClose={() => setShipDialog({ visible: false, order: null })}
      title="Kargo Bilgisi"
    >
      <Text variant="body" style={{ marginBottom: theme.spacing[4] }}>
        {shipDialog.order?.product.title}
      </Text>
      {reference ? (
        <>
          <Text variant="caption" tone="muted">{t('order.cargoReference')}</Text>
          <Text
            testID="ship-dialog-reference"
            variant="h3"
            selectable
            style={{ marginBottom: theme.spacing[2] }}
          >
            {reference}
          </Text>
          <Text variant="body">{t('order.cargoRefInstructions')}</Text>
        </>
      ) : null}
      <View style={styles.dialogActions}>
        <Button
          variant="ghost"
          title="İptal"
          onPress={() => setShipDialog({ visible: false, order: null })}
        />
        <Button
          variant="primary"
          title="Kargoya Verildi"
          onPress={handleShip}
          isLoading={updateStatusMutation.isPending}
        />
      </View>
    </Modal>
  );
}
