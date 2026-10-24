import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme, useHeaderBarInset, usePageGutter } from '@/ui';
import { useProductDetailLayout } from '../_lib/layout';

const { spacing } = theme;

/**
 * Arranges the product detail body by window width (`useProductDetailLayout`):
 *
 * - gallery above (phones): gallery, then one padded column with `primary`
 *   (title, price, description, actions, seller), `details` (specs, reviews) and `below` (similar
 *   listings); the same order as before the large-screen layout.
 * - split (medium and wider windows): two balanced columns. Left: the gallery with `details` under
 *   it; right: `primary` (starts under the floating top bar). Then `below` across the full width.
 */
export function ProductBodyLayout({
  gallery,
  primary,
  details,
  below,
}: {
  gallery: React.ReactNode;
  primary: React.ReactNode;
  details?: React.ReactNode;
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
          {primary}
          {details}
          {below}
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.splitRow} testID="product-split-layout">
        <View style={{ width: layout.gallerySide }} testID="product-gallery-column">
          {gallery}
          {details ? <View style={[styles.body, gutter]}>{details}</View> : null}
        </View>
        <View style={[styles.body, gutter, styles.splitInfo, { paddingTop: barInset }]} testID="product-info-column">
          {primary}
        </View>
      </View>
      {below ? <View style={[styles.body, gutter, styles.splitBelow]}>{below}</View> : null}
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing[4], gap: spacing[4] },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start' },
  splitInfo: { flex: 1, minWidth: 0 },
  splitBelow: { paddingTop: 0 },
});
