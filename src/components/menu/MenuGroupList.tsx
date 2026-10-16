import React from 'react';
import { router } from 'expo-router';
import { SectionCard } from '@/ui';
import type { ProfileBadgeKey, ProfileMenuGroup } from '@/lib/menu/profileMenu';
import { ProfileRow } from './ProfileRow';

/**
 * Menü gruplarının listesi — Profil sekmesi ve Ayarlar ekranı ortak: her grup sistemin beyaz
 * `SectionCard`'ı (başlık + vurgu çubuğu), içinde satırlar (`ProfileRow variant="card"`: ikon,
 * etiket, sayaç, chevron). Gruplar hep açık. Kartlar arası boşluk kabın `gap`'inden (fragment döner).
 */
export function MenuGroupList({
  groups,
  badges = {},
}: {
  groups: ProfileMenuGroup[];
  /** Bekleyen iş sayaçları (`useHomeBadges`): satırın `badgeKey`'ine göre. */
  badges?: Partial<Record<ProfileBadgeKey, number>>;
}) {
  return (
    <>
      {groups.map((group) => (
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
      ))}
    </>
  );
}
