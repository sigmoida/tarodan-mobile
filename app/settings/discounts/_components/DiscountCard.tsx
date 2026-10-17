import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Card, IconButton, Switch, Text } from '@/ui';

import { styles } from '../_lib/styles';
import { formatDate, quantitySummary, valueLabel, type Discount } from '../_lib/types';

/**
 * A single discount card: header, meta, active toggle, edit/delete actions. Memo'lu satır:
 * callback'ler kararlı referanstır ve indirimi argüman alır (satır başına closure yok).
 */
export const DiscountCard = React.memo(function DiscountCard({
  d,
  onToggle,
  onEdit,
  onDelete,
}: {
  d: Discount;
  onToggle: (d: Discount, isActive: boolean) => void;
  onEdit: (d: Discount) => void;
  onDelete: (d: Discount) => void;
}) {
  const { t } = useTranslation();
  const summary = quantitySummary(d, t);
  return (
    <Card variant="bordered" style={styles.discountCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text variant="h3">{d.name}</Text>
          {d.code ? (
            <View style={styles.codeBadgeWrap}>
              <Badge variant="default" size="sm">
                {d.code}
              </Badge>
            </View>
          ) : null}
        </View>
        <View style={styles.valueWrap}>
          <Text variant="h2" tone="primary">
            {valueLabel(d)}
          </Text>
          <Text variant="caption">{t('product.discount')}</Text>
        </View>
      </View>

      {d.description ? (
        <Text variant="bodySm" tone="muted">
          {d.description}
        </Text>
      ) : null}
      {summary ? (
        <Text variant="bodySm" tone="muted">
          {summary}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        <Text variant="caption">
          {d.scope === 'product' ? t('discount.scopeSelected') : t('discount.scopeAllStore')}
        </Text>
        <Text variant="caption">
          {formatDate(d.startDate)} - {formatDate(d.endDate)}
        </Text>
        <Text variant="caption">
          {d.usedCount} / {d.usageLimitTotal ?? '∞'}
        </Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.activeRow}>
          <Switch value={d.isActive} onValueChange={(v: boolean) => onToggle(d, v)} />
          <Text variant="bodySm" tone="muted">
            {d.isActive ? t('discount.active') : t('common.inactive')}
          </Text>
        </View>
        <View style={styles.iconActions}>
          <IconButton
            icon="pencil" iconVariant="solid"
            size="sm"
            accessibilityLabel={t('discount.editTitle')}
            onPress={() => onEdit(d)}
          />
          <IconButton
            icon="trash"
            variant="danger"
            size="sm"
            accessibilityLabel={t('discount.deleteTitle')}
            onPress={() => onDelete(d)}
          />
        </View>
      </View>
    </Card>
  );
});
