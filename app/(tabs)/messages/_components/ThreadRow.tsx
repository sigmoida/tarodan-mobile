import { Pressable, View } from 'react-native';
import { Avatar, Badge, Text } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatMessagePreview } from '@/utils/contentFilter';
import type { MessageThread } from '@/stores/messagesStore';
import { styles } from '../_lib/styles';
import { formatTime } from '../_lib/helpers';
import type { MessagesTabController } from '../_hooks/useMessagesTab';

/**
 * Tek sohbet satırı — avatar, ad/zaman, ürün bağlamı, son mesaj, okunmamış adet.
 * Sadelik (tasarım ilkesi 6): satır başı süs ikonları ve okunmamış noktası kalktı; okunmamış
 * bilgi zemin tonu + adet rozetinde.
 */
export function ThreadRow({ thread, f }: { thread: MessageThread; f: MessagesTabController }) {
  const { t } = useTranslation();
  const other = f.safeGetOther(thread);
  const hasUnread = thread.unreadCount > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.threadItem,
        hasUnread && styles.threadItemUnread,
        pressed && styles.threadItemPressed,
      ]}
      onPress={() => router.push(`/messages/${thread.id}`)}
      accessibilityRole="button"
    >
      <Avatar
        size="md"
        source={other.avatarUrl || undefined}
        name={other.displayName.charAt(0).toUpperCase()}
      />

      <View style={styles.threadContent}>
        <View style={styles.threadHeader}>
          <Text variant="label" style={[styles.participantName, hasUnread && styles.unreadText]} numberOfLines={1}>
            {other.displayName}
          </Text>
          <Text variant="caption" style={styles.threadTime}>
            {thread.lastMessage ? formatTime(thread.lastMessage.createdAt, t) : formatTime(thread.createdAt, t)}
          </Text>
        </View>

        {/* Ürün bağlamı — ürünsüz (genel) sohbette de bağlam göster. */}
        {thread.product ? (
          <Text variant="caption" style={styles.productRefText} numberOfLines={1}>
            {thread.product.title}
          </Text>
        ) : (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {t('message.generalMessage')}
          </Text>
        )}

        <Text variant="caption" style={[styles.lastMessage, hasUnread && styles.unreadText]} numberOfLines={1}>
          {thread.lastMessage?.senderId === f.user?.id ? t('message.youPrefix') : ''}
          {formatMessagePreview(thread.lastMessage?.content ?? '') || t('message.noMessagesYet')}
        </Text>
      </View>

      {hasUnread && <Badge style={styles.unreadBadge}>{thread.unreadCount}</Badge>}
    </Pressable>
  );
}
