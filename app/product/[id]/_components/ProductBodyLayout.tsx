import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme, useHeaderBarInset, usePageGutter } from '@/ui';
import { useProductDetailLayout } from '../_lib/layout';

const { spacing } = theme;

/**
 * Arranges the product detail body by window width (`useProductDetailLayout`):
 *
 * - gallery above (phones, medium windows): gallery, then one padded column with `primary`
 *   (title, price, description, actions, seller) followed by `secondary` (specs, reviews, similar);
 *   the same tree as before the large-screen layout.
 * - split (expanded windows): the gallery and the `primary` column side by side (the column starts
 *   under the floating top bar), then `secondary` across the full width below.
 */
export function ProductBodyLayout({
  gallery,
  primary,
  secondary,
}: {
  gallery: React.ReactNode;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
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
          {secondary}
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.splitRow} testID="product-split-layout">
        <View style={{ width: layout.gallerySide }}>{gallery}</View>
        <View style={[styles.body, gutter, styles.splitInfo, { paddingTop: barInset }]} testID="product-info-column">
          {primary}
        </View>
      </View>
      {secondary ? <View style={[styles.body, gutter, styles.splitSecondary]}>{secondary}</View> : null}
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing[4], gap: spacing[4] },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start' },
  splitInfo: { flex: 1, minWidth: 0 },
  splitSecondary: { paddingTop: 0 },
});
