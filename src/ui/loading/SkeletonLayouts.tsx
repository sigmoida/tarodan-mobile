import React from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { SECTION_CARD_METRICS as SC } from '../components/SectionCard';
import { SkeletonBlock } from './SkeletonBlock';
import { SkeletonAvatar, SkeletonLine, SkeletonText } from './Skeleton';
import type { AVATAR_SIZES } from '../components/Avatar';

const { colors, radius, spacing } = theme;

/**
 * Yerleşime sadık iskelet yapı taşları: gerçek bileşenin geometri sabitlerini (çerçeve, köşe,
 * dolgu, satır yüksekliği) AYNI kaynaktan okur — veri gelince içerik zıplamaz. Ürün kartı ve profil
 * satırı iskeletleri kendi bileşenlerinin yanında (`@/components/product` `SkeletonProductCard`,
 * `@/components/menu` `SkeletonMenuRow`): sabitler o bileşenlerle aynı dosyadan gelir.
 */

export interface SkeletonSectionCardProps {
  /** Başlık bandı (vurgu çubuğu + başlık) çizilsin mi (varsayılan açık). */
  title?: boolean;
  /** Sağda "Tümünü gör" hapı yer tutucusu. */
  action?: boolean;
  /** Gövde; verilmezse `lines` satırlık metin iskeleti. */
  children?: React.ReactNode;
  lines?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * `SectionCard` iskeleti — AYNI çerçeve (beyaz zemin, 1pt kenarlık, `radiusRole.section`, 12 dolgu)
 * ve başlık bandı (4×24 vurgu çubuğu + başlık satırı, altında 16 boşluk). Gövde `children`.
 */
export const SkeletonSectionCard: React.FC<SkeletonSectionCardProps> = ({
  title = true,
  action = false,
  children,
  lines = 3,
  style,
  testID,
}) => (
  <View style={[styles.sectionCard, style]} testID={testID}>
    {title || action ? (
      <View style={[styles.sectionHeader, action && { minHeight: SC.actionOuterHeight }]}>
        {title ? (
          <View style={styles.sectionTitleRow}>
            <SkeletonBlock width={SC.accentWidth} height={SC.accentHeight} borderRadius={SC.accentRadius} />
            <SkeletonBlock width="45%" height={SC.titleLineHeight * 0.75} />
          </View>
        ) : (
          <View />
        )}
        {action ? (
          <SkeletonBlock width={spacing[24]} height={SC.actionOuterHeight} borderRadius={radius.md} />
        ) : null}
      </View>
    ) : null}
    {children ?? <SkeletonText lines={lines} />}
  </View>
);

export interface SkeletonListRowProps {
  /** Soldaki avatar (varsayılan `md` = 40); `false` = avatarsız. */
  avatar?: keyof typeof AVATAR_SIZES | false;
  /** Metin satırı adedi (ilk satır `body`, diğerleri `bodySm`). */
  lines?: number;
  style?: StyleProp<ViewStyle>;
}

/** Avatar + iki satırlık liste satırı (adres, engellenen, bildirim, takip…) iskeleti. */
export const SkeletonListRow: React.FC<SkeletonListRowProps> = ({ avatar = 'md', lines = 2, style }) => (
  <View style={[styles.listRow, style]}>
    {avatar ? <SkeletonAvatar size={avatar} /> : null}
    <View style={styles.listRowText}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} variant={i === 0 ? 'body' : 'bodySm'} width={i === lines - 1 && lines > 1 ? '60%' : '85%'} />
      ))}
    </View>
  </View>
);

/**
 * Sohbet balonu ölçüleri — TEK kaynak: sohbet ekranı (`app/messages/[threadId]/_lib/styles.ts`) ve
 * `SkeletonChatBubble` buradan okur (web MessageBubble: px-4 py-2.5 rounded-2xl, kuyruk köşesi md).
 */
export const CHAT_BUBBLE_METRICS = {
  maxWidth: '85%' as DimensionValue,
  paddingHorizontal: spacing[4],
  paddingVertical: spacing[2.5],
  radius: radius['2xl'],
  tailRadius: radius.md,
  rowGap: spacing[2],
  /** Karşı tarafın avatar sütunu (avatar `sm` + pay) ve balona uzaklığı. */
  avatarColumn: 36,
  avatarGap: spacing[2],
  footerGap: spacing[1],
} as const;
const CB = CHAT_BUBBLE_METRICS;

export interface SkeletonChatBubbleProps {
  /** `left` = karşı taraf (avatar sütunlu), `right` = kendi mesajı. */
  side?: 'left' | 'right';
  /** Balon genişliği (satır genişliğine göre; en çok %85). */
  width?: DimensionValue;
  /** Mesaj metni satır adedi. */
  lines?: number;
  /** `left` için avatar çizilsin mi (grubun ilk mesajı); sütun her zaman yer kaplar. */
  showAvatar?: boolean;
  /** `left` için avatar sütunu hiç ayrılmasın (avatarsız balonlar: destek talebi mesajları). */
  avatarColumn?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sohbet balonu iskeleti — gerçek balonla AYNI köşe/dolgu/kuyruk ve satır yüksekliği (bodySm metin +
 * caption saat). Kendi balonu sağda, karşı taraf solda avatar sütunuyla.
 */
export const SkeletonChatBubble: React.FC<SkeletonChatBubbleProps> = ({
  side = 'left',
  width = '60%',
  lines = 1,
  showAvatar = true,
  avatarColumn = true,
  style,
}) => {
  const own = side === 'right';
  return (
    <View style={[styles.chatRow, own ? styles.chatRowOwn : null, style]}>
      {!own && avatarColumn ? (
        <View style={styles.chatAvatar}>{showAvatar ? <SkeletonAvatar size="sm" /> : null}</View>
      ) : null}
      <View
        style={[
          styles.bubble,
          own ? styles.bubbleOwn : styles.bubbleOther,
          { width },
        ]}
      >
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonLine key={i} variant="bodySm" width={i === lines - 1 && lines > 1 ? '70%' : '100%'} />
        ))}
        <View style={styles.bubbleFooter}>
          <SkeletonLine variant="caption" width={spacing[8]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: colors.surface.elevated,
    borderWidth: SC.borderWidth,
    borderColor: colors.border.DEFAULT,
    borderRadius: SC.radius,
    padding: SC.padding,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing[4],
    marginBottom: SC.headerGap,
  },
  sectionTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SC.titleGap,
    minHeight: Math.max(SC.accentHeight, SC.titleLineHeight),
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  listRowText: { flex: 1 },
  chatRow: { flexDirection: 'row', marginBottom: CB.rowGap },
  chatRowOwn: { justifyContent: 'flex-end' },
  chatAvatar: { width: CB.avatarColumn, marginRight: CB.avatarGap },
  // Balon iskeleti: gerçek balonun çerçevesi (açık zemin) + içinde satır blokları.
  bubble: {
    maxWidth: CB.maxWidth,
    paddingHorizontal: CB.paddingHorizontal,
    paddingVertical: CB.paddingVertical,
    borderRadius: CB.radius,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  bubbleOwn: { borderBottomRightRadius: CB.tailRadius },
  bubbleOther: { borderBottomLeftRadius: CB.tailRadius },
  bubbleFooter: { marginTop: CB.footerGap, alignItems: 'flex-end' },
});
