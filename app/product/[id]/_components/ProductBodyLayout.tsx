import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme, useHeaderBarInset, usePageGutter } from '@/ui';
import { SPLIT_COLUMN_GAP, useProductDetailLayout } from '../_lib/layout';

const { spacing } = theme;

/**
 * Arranges the product detail body by window width (`useProductDetailLayout`):
 *
 * - gallery above (phones): gallery, then one padded column: `head` (title, price), `description`,
 *   `rest` (actions, seller), `specs`, `below` (reviews, similar listings); the phone order.
 * - split (medium and wider windows): two equal columns `SPLIT_COLUMN_GAP` apart, the gallery
 *   (under the floating top bar, inset by the page gutter) beside a column with `head`,
 *   `description` and `rest`; then `specs` (its cards side by side in the same two columns, see
 *   `ProductSpecs`) and `below` across the full width.
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
        <View
          style={[
            styles.galleryColumn,
            { width: layout.gallerySide + gutter.paddingHorizontal, paddingLeft: gutter.paddingHorizontal, paddingTop: barInset },
          ]}
          testID="product-gallery-column"
        >
          {gallery}
        </View>
        <View
          style={[styles.body, gutter, styles.splitInfo, { paddingTop: barInset }]}
          testID="product-info-column"
        >
          {head}
          {description}
          {rest}
        </View>
      </View>
      <View style={[styles.body, gutter, styles.splitBelow]} testID="product-below">
        {specs}
        {below}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing[4], gap: spacing[4] },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start' },
  // The same gap below the gallery (and its thumbnails) as between the page sections.
  galleryColumn: { paddingBottom: spacing[4] },
  // The column gap on the left (the gallery column already carries the left gutter).
  splitInfo: { flex: 1, minWidth: 0, paddingLeft: SPLIT_COLUMN_GAP },
  splitBelow: { paddingTop: 0 },
});
