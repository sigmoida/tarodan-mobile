import React from 'react';
import { View } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { InboxRow } from '@/components/common/InboxRow';
import { Icon } from '@/ui';
import { useTranslation } from 'react-i18next';
import { formatRelativeDate } from '@/utils/format';
import { styles } from '../_lib/styles';
import { getIconForType } from '../_lib/icons';
import { STOCKOUT_TYPES, type Notification } from '../_lib/types';

/**
 * Tek bildirim satırı — Mesajlar ile aynı `InboxRow` iskeleti. Sol kutuda stok bildiriminde
 * ürün foto, aksi halde tip ikonu; okunmamış vurgusu Mesajlar'daki gibi zemin tonu + yarı kalın metin.
 */
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
    <InboxRow
      leading={
        STOCKOUT_TYPES.has(item.type) && item.data?.productImage ? (
          <AppImage source={item.data.productImage} recyclingKey={String(item.id)} style={styles.thumb} />
        ) : (
          <View style={[styles.iconContainer, { backgroundColor: bg }]}>
            <Icon name={icon} variant="solid" size={20} color={color} />
          </View>
        )
      }
      title={item.title}
      time={formatRelativeDate(item.createdAt, t)}
      preview={item.message}
      previewLines={2}
      unread={isUnread}
      onPress={() => onPress(item)}
    />
  );
}

export const NotificationRow = React.memo(NotificationRowBase);
