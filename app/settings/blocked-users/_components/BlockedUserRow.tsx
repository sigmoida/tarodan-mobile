import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Text } from '@/ui';
import type { BlockedUser } from '@/lib/api';

import { styles } from '../_lib/styles';

/** Geçersiz tarih/locale sunucudan gelirse satır ÇÖKMEZ — tarih satırı düşer. */
function formatBlockedAt(value: string | undefined, locale: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return date.toLocaleDateString(locale);
  } catch {
    return date.toLocaleDateString();
  }
}

/** Engellenen kullanıcı satırı — kimlik + engelleme tarihi + "Engeli Kaldır". */
export function BlockedUserRow({
  item,
  busy,
  onUnblock,
}: {
  item: BlockedUser;
  busy: boolean;
  onUnblock: (userId: string, name: string) => void;
}) {
  const { t } = useTranslation();
  const name = item.displayName || item.companyName || item.username || '';
  const blockedAt = formatBlockedAt(item.blockedAt, t('common.dateLocale'));

  return (
    <View style={styles.row}>
      <Avatar size="md" source={item.avatarUrl || undefined} name={name.charAt(0) || '?'} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {name}
        </Text>
        {blockedAt ? (
          <Text style={styles.rowMeta}>{t('profile.blockedPage.blockedAt', { date: blockedAt })}</Text>
        ) : null}
      </View>
      <Button
        variant="outline"
        size="sm"
        title={t('profile.unblock')}
        disabled={busy}
        onPress={() => onUnblock(item.id, name)}
      />
    </View>
  );
}
