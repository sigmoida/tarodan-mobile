import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Modal, Text } from '@/ui';
import { styles } from '../_lib/styles';
import type { SaleActionsController } from '../_hooks/useSaleActions';

/** Kargoya verme onay diyaloğu — numara artık sunucu üretiyor, elle giriş yok. */
export function ShipDialog({ actions }: { actions: SaleActionsController }) {
  const { t } = useTranslation();
  const { shipDialog, setShipDialog, handleShip, updateStatusMutation } = actions;

  return (
    <Modal
      isOpen={shipDialog.visible}
      onClose={() => setShipDialog({ visible: false, order: null })}
      title="Kargo Bilgisi"
    >
      <Text variant="body" style={{ marginBottom: 16 }}>
        {shipDialog.order?.product.title}
      </Text>
      <Text variant="body">{t('order.cargoRefInstructions')}</Text>
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
