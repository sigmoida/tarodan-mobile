import { View, TouchableOpacity } from 'react-native';
import { Badge, Button, Text, theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../_lib/styles';

const { colors } = theme;

/**
 * Turuncu bildirim header'ı — geri butonu + başlık, opsiyonel okunmamış rozeti
 * ve "Tümünü Okundu". Auth/loading durumlarında yalnız geri + başlık gösterilir
 * (unreadCount=0 → rozet/buton çıkmaz).
 */
export function NotificationsHeader({
  onBack,
  unreadCount = 0,
  onMarkAll,
}: {
  onBack: () => void;
  unreadCount?: number;
  onMarkAll?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, theme.spacing[3]) }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text variant="h2" tone="inverted">Bildirimler</Text>
        {unreadCount > 0 ? (
          <Badge variant="primary" style={styles.headerBadge}>{unreadCount}</Badge>
        ) : null}
      </View>
      {unreadCount > 0 && onMarkAll ? (
        <Button
          variant="ghost"
          size="sm"
          title="Tümünü Okundu"
          onPress={onMarkAll}
          textStyle={styles.markAllText}
        />
      ) : null}
    </View>
  );
}
