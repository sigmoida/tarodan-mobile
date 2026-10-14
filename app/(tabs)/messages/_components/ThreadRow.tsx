import { Avatar, Text } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { InboxRow } from '@/components/common/InboxRow';
import { formatMessagePreview } from '@/utils/contentFilter';
import type { MessageThread } from '@/stores/messagesStore';
import { styles } from '../_lib/styles';
import { formatTime } from '../_lib/helpers';
import type { MessagesTabController } from '../_hooks/useMessagesTab';

/**
 * Tek sohbet satırı — ortak `InboxRow` iskeleti (Bildirimler ile aynı): avatar, ad/zaman,
 * ürün bağlamı, son mesaj, okunmamış adet. Okunmamış bilgi zemin tonu + adet rozetinde.
 */
export function ThreadRow({ thread, f }: { thread: MessageThread; f: MessagesTabController }) {
  const { t } = useTranslation();
  const other = f.safeGetOther(thread);

  return (
    <InboxRow
      leading={
        <Avatar
          size="md"
          source={other.avatarUrl || undefined}
          name={other.displayName.charAt(0).toUpperCase()}
        />
      }
      title={other.displayName}
      time={formatTime(thread.lastMessage ? thread.lastMessage.createdAt : thread.createdAt, t)}
      // Ürün bağlamı — ürünsüz (genel) sohbette de bağlam göster.
      meta={
        thread.product ? (
          <Text variant="caption" style={styles.productRefText} numberOfLines={1}>
            {thread.product.title}
          </Text>
        ) : (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {t('message.generalMessage')}
          </Text>
        )
      }
      preview={
        <>
          {thread.lastMessage?.senderId === f.user?.id ? t('message.youPrefix') : ''}
          {formatMessagePreview(thread.lastMessage?.content ?? '') || t('message.noMessagesYet')}
        </>
      }
      unread={thread.unreadCount > 0}
      unreadCount={thread.unreadCount}
      onPress={() => router.push(`/messages/${thread.id}`)}
    />
  );
}
