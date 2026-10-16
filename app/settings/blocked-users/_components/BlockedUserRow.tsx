import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Text, ListRowCard } from '@/ui';
import type { BlockedUser } from '@/lib/api';
import { formatLongDate } from '@/utils/format';

import { styles } from '../_lib/styles';

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
  const blockedAt = formatLongDate(item.blockedAt, t('common.dateLocale'));

  return (
    <ListRowCard style={styles.row}>
      <Avatar size="md" source={item.avatarUrl || undefined} name={name.charAt(0) || '?'} />
      <View style={styles.rowInfo}>
        <Text variant="label" numberOfLines={1}>
          {name}
        </Text>
        {blockedAt ? (
          <Text variant="caption" style={styles.rowMeta}>{t('profile.blockedPage.blockedAt', { date: blockedAt })}</Text>
        ) : null}
      </View>
      <Button
        variant="outline"
        size="sm"
        title={t('profile.unblock')}
        disabled={busy}
        onPress={() => onUnblock(item.id, name)}
      />
    </ListRowCard>
  );
}
