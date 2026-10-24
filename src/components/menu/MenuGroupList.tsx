import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { PAGE_SECTION_GAP, SectionCard, useWindowClass } from '@/ui';
import type { ProfileBadgeKey, ProfileMenuGroup } from '@/lib/menu/profileMenu';
import { ProfileRow } from './ProfileRow';

/**
 * Splits menu groups into two independent columns of about the same height: each group (its rows
 * plus one for the title) goes to the shorter column, in order. Pure, for the wide layout below.
 */
export function splitMenuColumns<T extends { items: readonly unknown[] }>(groups: readonly T[]): [T[], T[]] {
  const columns: [T[], T[]] = [[], []];
  const heights = [0, 0];
  for (const group of groups) {
    const side = heights[1]! < heights[0]! ? 1 : 0;
    columns[side].push(group);
    heights[side]! += group.items.length + 1;
  }
  return columns;
}

/**
 * Menü gruplarının listesi — Profil sekmesi ve Ayarlar ekranı ortak: her grup sistemin beyaz
 * `SectionCard`'ı (başlık + vurgu çubuğu), içinde satırlar (`ProfileRow variant="card"`: ikon,
 * etiket, sayaç, chevron). Gruplar hep açık. Kartlar arası boşluk kabın `gap`'inden (fragment döner).
 * Expanded and wider windows: the cards stand in two independent columns (`splitMenuColumns`)
 * instead of one stretched column; phones and medium windows keep one column.
 */
export function MenuGroupList({
  groups,
  badges = {},
}: {
  groups: ProfileMenuGroup[];
  /** Bekleyen iş sayaçları (`useHomeBadges`): satırın `badgeKey`'ine göre. */
  badges?: Partial<Record<ProfileBadgeKey, number>>;
}) {
  const windowClass = useWindowClass();
  const card = (group: ProfileMenuGroup) => (
    <SectionCard key={group.key} title={group.title} testID={`menu-group-${group.key}`}>
      {group.items.map((item) => (
        <ProfileRow
          key={item.key}
          variant="card"
          testID={item.testID ?? `menu-item-${item.key}`}
          icon={item.icon}
          label={item.label}
          tone={item.tone}
          rightBadge={item.rightBadge}
          count={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0}
          onPress={() => router.push(item.to as never)}
        />
      ))}
    </SectionCard>
  );

  if (windowClass !== 'expanded' && windowClass !== 'large') return <>{groups.map(card)}</>;
  const [left, right] = splitMenuColumns(groups);
  return (
    <View style={styles.columns} testID="menu-group-columns">
      <View style={styles.column} testID="menu-group-column-0">
        {left.map(card)}
      </View>
      <View style={styles.column} testID="menu-group-column-1">
        {right.map(card)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: PAGE_SECTION_GAP },
  column: { flex: 1, minWidth: 0, gap: PAGE_SECTION_GAP },
});
