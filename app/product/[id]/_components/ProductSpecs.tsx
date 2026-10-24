import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text, theme } from '@/ui';
import { asLabel, formatCondition } from '@/utils/format';
import { colorValue, materialValue, scaleValue, technicalAttributeRows } from '../_lib/attributes';
import type { Product } from '../_lib/types';
import { useProductDetailLayout } from '../_lib/layout';

const { colors, spacing } = theme;

type Row = { key: string; label: string; value: string };

/** Web `DetailRow`: solda etiket (muted), sağda değer (semibold, sağa yaslı); satırlar çizgiyle ayrılır. */
function DetailRows({ rows }: { rows: Row[] }) {
  return (
    <View>
      {rows.map((row, i) => (
        <View key={row.key} style={[styles.row, i > 0 && styles.divided]}>
          <Text variant="bodySm" tone="muted" style={styles.label}>
            {row.label}
          </Text>
          <Text variant="bodySm" weight="semibold" align="right" style={styles.value}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * "Özellikler" ve "Teknik özellikler" kartları (web `ProductSpecs`): iki ayrı SectionCard,
 * satır satır etiket/değer. Teknik kart yalnız model/renk/kutu durumu/nitelik varsa çizilir.
 * Tablets (`useProductDetailLayout().split`): the two cards stand side by side.
 */
export function ProductSpecs({ product }: { product: Product }) {
  const { t } = useTranslation();
  const { split } = useProductDetailLayout();
  const available = product.availableQuantity ?? product.quantity;
  const category = typeof product.category === 'object' ? product.category?.name : product.category;
  const color = colorValue(product);
  const technicalRows = technicalAttributeRows(product.attributes);

  const info: Row[] = [];
  const add = (rows: Row[], key: string, label: string, value: unknown) => {
    const text = value == null ? '' : String(value).trim();
    if (text) rows.push({ key, label, value: text });
  };
  add(info, 'code', t('product.productCode'), product.productCode);
  add(info, 'brand', t('product.brand'), asLabel(product.brand));
  info.push({ key: 'scale', label: t('product.scale'), value: scaleValue(product) || '—' });
  info.push({ key: 'material', label: t('product.material'), value: materialValue(product) || '—' });
  add(info, 'manufacturer', t('product.manufacturer'), asLabel(product.manufacturer));
  add(info, 'category', t('product.category'), category);
  if (product.condition) add(info, 'condition', t('product.condition'), formatCondition(product.condition));
  info.push({ key: 'year', label: t('product.year'), value: product.year ? String(product.year) : '—' });
  if (available !== undefined) {
    info.push({
      key: 'stock',
      label: t('product.stock'),
      value:
        available === null
          ? t('membership.unlimited')
          : available > 0
            ? `${available} ${t('product.available')}`
            : t('product.stockFinished'),
    });
  }

  const technical: Row[] = [];
  add(technical, 'model', t('product.model'), asLabel(product.carModel));
  add(technical, 'modelCode', t('product.modelCode'), product.modelCode);
  add(technical, 'color', t('product.color'), color);
  if (product.isBoxed != null) {
    add(technical, 'boxed', t('product.boxedCondition'), product.isBoxed ? t('product.boxed') : t('product.unboxed'));
  }
  technicalRows.forEach((r) => technical.push(r));

  // Side by side (tablets) the shorter card stretches to the taller one's height, like web.
  const cardStyle = split ? styles.fill : undefined;
  const details = (
    <SectionCard title={t('product.detailsSection')} testID="product-specs" style={cardStyle}>
      <DetailRows rows={info} />
    </SectionCard>
  );
  const technicalCard =
    technical.length > 0 ? (
      <SectionCard title={t('product.technicalDetails')} testID="product-technical" style={cardStyle}>
        <DetailRows rows={technical} />
      </SectionCard>
    ) : null;

  if (split) {
    return (
      <View style={styles.pair} testID="product-specs-row">
        <View style={styles.pairCell}>{details}</View>
        {technicalCard ? <View style={styles.pairCell}>{technicalCard}</View> : null}
      </View>
    );
  }
  return (
    <>
      {details}
      {technicalCard}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[4], paddingVertical: spacing[2.5] },
  divided: { borderTopWidth: 1, borderTopColor: colors.border.DEFAULT },
  label: { flexShrink: 0 },
  value: { flex: 1 },
  pair: { flexDirection: 'row', alignItems: 'stretch', gap: spacing[4] },
  pairCell: { flex: 1, minWidth: 0 },
  fill: { flex: 1 },
});
