import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme, useHeaderBarInset, usePageGutter } from '@/ui';
import { useProductDetailLayout } from '../_lib/layout';

const { spacing } = theme;

/**
 * Arranges the product detail body by window width (`useProductDetailLayout`):
 *
 * - gallery above (phones): gallery, then one padded column: `head` (title, price), `description`,
 *   `rest` (actions, seller), `specs`, `below` (reviews, similar listings); the phone order.
 * - split (medium and wider windows): the gallery (starting under the floating top bar) beside a
 *   column with `head` and `rest`; under them `description` and `specs` side by side; then `below`
 *   across the full width.
 */
export function ProductBodyLayout({
  gallery,
  head,
  description,
  rest,
  specs,
  below,
}: {
  gallery: React.ReactNode;
  head: React.ReactNode;
  description?: React.ReactNode;
  rest?: React.ReactNode;
  specs?: React.ReactNode;
  below?: React.ReactNode;
}) {
  const layout = useProductDetailLayout();
  const barInset = useHeaderBarInset();
  // Side padding of the text columns: the page gutter (16 on phones, wider on tablets).
  const gutter = { paddingHorizontal: usePageGutter() };

  if (!layout.split) {
    return (
      <>
        {gallery}
        <View style={[styles.body, gutter]}>
          {head}
          {description}
          {rest}
          {specs}
          {below}
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.splitRow} testID="product-split-layout">
        <View style={{ width: layout.gallerySide, paddingTop: barInset }} testID="product-gallery-column">
          {gallery}
        </View>
        <View style={[styles.body, gutter, styles.splitInfo, { paddingTop: barInset }]} testID="product-info-column">
          {head}
          {rest}
        </View>
      </View>
      <View style={[styles.body, gutter, styles.splitBelow]} testID="product-below">
        {description || specs ? (
          <View style={styles.pairRow} testID="product-description-specs-row">
            {description ? <View style={styles.pairCell}>{description}</View> : null}
            {specs ? <View style={styles.pairCell}>{specs}</View> : null}
          </View>
        ) : null}
        {below}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing[4], gap: spacing[4] },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start' },
  splitInfo: { flex: 1, minWidth: 0 },
  splitBelow: { paddingTop: 0 },
  pairRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4] },
  pairCell: { flex: 1, minWidth: 0 },
});
