import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Badge, PAGE_GUTTER, Text, theme } from '@/ui';

const { colors, spacing, typography } = theme;

/** Sol kutu ölçüsü (pt) — `Avatar size="md"` ile aynı; ikon/ürün görseli kutuları bunu kullanır. */
export const INBOX_LEADING_SIZE = 40;

export interface InboxRowProps {
  /** Sol kutu: `Avatar`, tip ikonu kutusu veya ürün görseli (`INBOX_LEADING_SIZE`). */
  leading: React.ReactNode;
  title: string;
  /** Sağ üst zaman damgası (hazır biçimlenmiş). */
  time: string;
  /** Başlık ile ön izleme arasındaki isteğe bağlı bağlam satırı (ör. ürün adı). */
  meta?: React.ReactNode;
  /** Ön izleme metni (son mesaj / bildirim gövdesi). */
  preview?: React.ReactNode;
  previewLines?: number;
  /** Okunmamış vurgusu: `primary[50]` zemin + yarı kalın başlık/ön izleme. */
  unread?: boolean;
  /** > 0 ise sağda adet rozeti (99+ kırpılır). */
  unreadCount?: number;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Gelen kutusu satırı — Mesajlar ve Bildirimler sekmelerinin ORTAK iskeleti: tam genişlik, alt
 * ayraçlı, `surface.elevated` zeminli satır; solda 40pt kutu, ortada [başlık ........ zaman] /
 * bağlam / ön izleme, sağda isteğe bağlı adet rozeti. Basılı: `surface.alt`; okunmamış: `primary[50]`.
 * Satır dışı düzen (liste, boş durum) ekranın işidir.
 */
export function InboxRow({
  leading,
  title,
  time,
  meta,
  preview,
  previewLines = 1,
  unread = false,
  unreadCount = 0,
  onPress,
  testID,
  style,
}: InboxRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.item, unread && styles.itemUnread, pressed && styles.itemPressed, style]}
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
    >
      {leading}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="label" style={[styles.title, unread && styles.unreadText]} numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" style={styles.time}>
            {time}
          </Text>
        </View>

        {meta}

        {preview != null ? (
          <Text
            variant="caption"
            style={[styles.preview, unread && styles.unreadText]}
            numberOfLines={previewLines}
          >
            {preview}
          </Text>
        ) : null}
      </View>

      {unreadCount > 0 && (
        <Badge variant="danger" appearance="solid" size="sm" style={styles.badge}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAGE_GUTTER,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  itemUnread: {
    backgroundColor: colors.primary[50],
  },
  itemPressed: {
    backgroundColor: colors.surface.alt,
  },
  content: {
    flex: 1,
    marginLeft: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: colors.text.heading,
  },
  time: {
    color: colors.text.muted,
    marginLeft: spacing[2],
  },
  preview: {
    color: colors.text.muted,
    marginTop: spacing[1],
  },
  unreadText: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.heading,
  },
  badge: {
    marginLeft: spacing[2],
  },
});
