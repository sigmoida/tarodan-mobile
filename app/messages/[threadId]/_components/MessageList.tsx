import React from 'react';
import { View, FlatList } from 'react-native';
import { Avatar, Text, theme } from '@/ui';

import { parseMessageContent } from '@/utils/contentFilter';
import { AppImage } from '@/components/AppImage';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { styles } from '../_lib/styles';
import { formatTime } from '../_lib/helpers';
import type { MessageThreadController } from '../_hooks/useMessageThread';
import type { Message } from '@/stores/messagesStore';
import { MessageTicks } from './MessageTicks';
import { TypingIndicator } from './TypingIndicator';

const { colors } = theme;

const DateDivider = React.memo(function DateDivider({ date }: { date: string }) {
  return (
    <View style={styles.dateDivider}>
      <View style={styles.dateDividerLine} />
      <Text variant="caption" style={styles.dateDividerText}>{date}</Text>
      <View style={styles.dateDividerLine} />
    </View>
  );
});

/**
 * Tek mesaj balonu. `React.memo` + `parseMessageContent` içerik başına useMemo: liste yeniden
 * türetildiğinde (yeni mesaj, okundu durumu) değişmeyen mesajın ayrıştırması ve balonu tekrar
 * çalışmaz (React Query yapısal paylaşımı değişmeyen mesaj nesnesinin referansını korur).
 */
const MessageRow = React.memo(function MessageRow({
  message,
  isOwn,
  showAvatar,
  otherAvatarUrl,
  otherInitial,
}: {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  otherAvatarUrl: string | undefined;
  otherInitial: string;
}) {
  const content: string = message.content || '';
  const parsed = React.useMemo(() => parseMessageContent(content), [content]);

  return (
    <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
      {!isOwn && (
        <View style={styles.avatarPlaceholder}>
          {showAvatar ? <Avatar size="sm" source={otherAvatarUrl} name={otherInitial} /> : null}
        </View>
      )}

      <View style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
        {parsed.images.length > 0 ? (
          <View style={styles.messageImagesWrap}>
            {parsed.images.map((img, idx) => (
              <AppImage
                key={`${message.id}-img-${idx}`}
                source={img}
                variant="card"
                style={styles.messageImage}
                resizeMode="cover"
                // Mesaj ekleri API redirect uçtan gelir (`/api/media/message-attachment/{id}`)
                // ve JWT ister — bearer'sız istek 401 alıp sessizce placeholder'a düşüyordu
                // (task 4, parite P0 #4). Ürün görselleri gibi public değil, bu yüzden burada
                // opt-in ediyoruz.
                authenticated
              />
            ))}
          </View>
        ) : null}
        {parsed.text ? (
          <Text variant="bodySm" color={isOwn ? colors.text.inverted : colors.text.heading}>
            {parsed.text}
          </Text>
        ) : null}
        <View style={styles.messageFooter}>
          <Text variant="caption" color={isOwn ? colors.overlay.white70 : colors.text.subtle}>
            {formatTime(message.createdAt)}
          </Text>
          {isOwn && <MessageTicks status={message.status} />}
        </View>
      </View>
    </View>
  );
});

/**
 * Grouped, date-divided message list with own/other bubbles (web MessageBubble: kendi balonu
 * primary-500, karşı taraf çerçeveli beyaz; okundu işareti turuncu çift tik).
 *
 * Virtualized (#74): the grouped structure is flattened into typed rows
 * (divider + message) and rendered through a FlatList so only on-screen bubbles
 * mount — unbounded chat history no longer mounts every row up front. Auto-scroll
 * is driven by `useAutoScroll` (see B3 layout fix): `onScroll` tracks distance
 * from bottom in a ref, `onContentSizeChange` only scrolls when near the bottom
 * or a send forced it — reading history no longer gets yanked to the end.
 */
type Row =
  | { kind: 'divider'; key: string; date: string }
  | { kind: 'message'; key: string; message: Message; isOwn: boolean; showAvatar: boolean };

export function MessageList({ f }: { f: MessageThreadController }) {
  const { user, other } = f;

  const rows = React.useMemo<Row[]>(() => {
    const out: Row[] = [];
    f.groupedMessages.forEach((group, groupIndex) => {
      out.push({ kind: 'divider', key: `divider-${groupIndex}-${group.date}`, date: group.date });
      group.messages.forEach((message, messageIndex) => {
        const isOwn = message.senderId === user?.id;
        const showAvatar =
          !isOwn &&
          (messageIndex === 0 ||
            group.messages[messageIndex - 1]?.senderId !== message.senderId);
        out.push({ kind: 'message', key: message.id, message, isOwn, showAvatar });
      });
    });
    return out;
  }, [f.groupedMessages, user?.id]);

  const otherAvatarUrl = other?.avatarUrl || undefined;
  const otherInitial = other?.displayName?.charAt(0) || '?';
  const renderItem = React.useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'divider') return <DateDivider date={item.date} />;
      return (
        <MessageRow
          message={item.message}
          isOwn={item.isOwn}
          showAvatar={item.showAvatar}
          otherAvatarUrl={otherAvatarUrl}
          otherInitial={otherInitial}
        />
      );
    },
    [otherAvatarUrl, otherInitial],
  );

  if (f.isLoadingMessages && f.messages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <RowListSkeleton rows={6} />
      </View>
    );
  }

  return (
    <FlatList
      ref={f.scrollViewRef}
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={renderItem}
      style={[styles.messagesList, !f.isPositioned && styles.messagesListHidden]}
      contentContainerStyle={styles.messagesContent}
      onContentSizeChange={f.handleContentSizeChange}
      onScroll={f.handleScroll}
      scrollEventThrottle={16}
      // Pencereleme: varsayılan 21 ekranlık pencere uzun geçmişte gereksiz satır tutar. İlk
      // konumlanma `scrollToEnd` (useAutoScroll) ile yapılır; `initialNumToRender` varsayılanda
      // bırakıldı ve satırlar ölçülerek yerleşir (getItemLayout yok — balon yüksekliği değişken).
      windowSize={11}
      maxToRenderPerBatch={10}
      ListFooterComponent={
        // TypingIndicator görünüp kaybolunca içerik yüksekliği DEĞİŞMESİN diye
        // sabit yükseklikli bir kapsayıcıya alınır (bkz. layout denetimi B3) —
        // aksi halde onContentSizeChange → scrollToEnd tetiklenip liste dibe
        // fırlıyordu. Mevcut 20pt alt boşluk da bu kapsayıcıyla korunur.
        <View style={styles.typingIndicatorFooter}>
          <TypingIndicator visible={f.isPeerTyping} />
        </View>
      }
    />
  );
}
