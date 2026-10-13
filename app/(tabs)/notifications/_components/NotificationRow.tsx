import React from 'react';
import { View } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { Icon, Text, ListRowCard } from '@/ui';
import { useTranslation } from 'react-i18next';
import { formatRelativeDate } from '@/utils/format';
import { styles } from '../_lib/styles';
import { getIconForType } from '../_lib/icons';
import { STOCKOUT_TYPES, type Notification } from '../_lib/types';

/** Tek bildirim satırı — stok bildiriminde ürün foto, aksi halde tip ikonu. */
function NotificationRowBase({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (item: Notification) => void;
}) {
  const { t } = useTranslation();
  const isUnread = !(item.read || item.isRead);
  const { icon, color, bg } = getIconForType(item.type);

  return (
    <ListRowCard gap={0} style={[styles.item, isUnread && styles.itemUnread]} onPress={() => onPress(item)}>
      {STOCKOUT_TYPES.has(item.type) && item.data?.productImage ? (
        <AppImage source={item.data.productImage} recyclingKey={String(item.id)} style={styles.thumb} />
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          <Icon name={icon} variant="solid" size={20} color={color} />
        </View>
      )}
      <View style={styles.content}>
        <Text
          variant="bodySm"
          weight={isUnread ? 'bold' : 'semibold'}
          numberOfLines={1}
          style={styles.titleSpacing}
        >
          {item.title}
        </Text>
        <Text variant="bodySm" tone="muted" numberOfLines={2} style={styles.messageSpacing}>
          {item.message}
        </Text>
        <Text variant="caption" tone="subtle">
          {formatRelativeDate(item.createdAt, t)}
        </Text>
      </View>
      {isUnread ? <View style={styles.dot} /> : null}
    </ListRowCard>
  );
}

export const NotificationRow = React.memo(NotificationRowBase);
