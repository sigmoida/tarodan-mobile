import { useCallback, useMemo, useRef } from 'react';
import type { FlatList } from 'react-native';
import type { ProductImage } from '../_lib/types';

type ScrollEvent = { nativeEvent: { contentOffset: { x: number } } };

/**
 * Keeps a full-width horizontal pager and its thumbnail strip on the same page. Shared by the product
 * gallery and the full-screen viewer.
 *
 * A thumbnail tap selects its page at once and animates the pager there. The scroll events of that
 * animation would report every page in between and make the selection flicker through them, so
 * while a tap is animating only the target page is reported. Reporting goes back to normal when the
 * target is reached, when the user starts dragging, or when a scroll comes to rest (momentum end);
 * at rest the page actually shown is reported. A plain touch does not release the target: on
 * Android it does not stop a programmatic scroll, so releasing on it would bring the flicker back.
 *
 * `pagerProps` go on the pager `FlatList` as a whole (ref, paging, page layout, scroll handlers),
 * spread last so no caller overrides one of the release paths by accident.
 */
export function useThumbPager({
  width,
  total,
  current,
  onPageChange,
}: {
  /** Page width (pt): the pager is exactly one page wide. */
  width: number;
  total: number;
  /** The selected page. */
  current: number;
  onPageChange: (page: number) => void;
}) {
  const pagerRef = useRef<FlatList<ProductImage>>(null);
  // Page a thumbnail tap is animating to; null while the scroll events report pages.
  const targetPage = useRef<number | null>(null);

  const pageAt = useCallback(
    (e: ScrollEvent): number | null => {
      if (width <= 0) return null;
      const page = Math.round(e.nativeEvent.contentOffset.x / width);
      return page >= 0 && page < total ? page : null;
    },
    [total, width],
  );

  const onScroll = useCallback(
    (e: ScrollEvent) => {
      const page = pageAt(e);
      if (page === null) return;
      if (targetPage.current !== null) {
        if (page !== targetPage.current) return;
        targetPage.current = null;
      }
      onPageChange(page);
    },
    [onPageChange, pageAt],
  );

  // The user takes over: their swipe reports pages again.
  const release = useCallback(() => {
    targetPage.current = null;
  }, []);

  // The scroll came to rest: report the page actually shown.
  const onMomentumScrollEnd = useCallback(
    (e: ScrollEvent) => {
      targetPage.current = null;
      const page = pageAt(e);
      if (page !== null) onPageChange(page);
    },
    [onPageChange, pageAt],
  );

  const scrollToPage = useCallback(
    (index: number) => {
      if (index < 0 || index >= total) return;
      // Re-tapping the selected page keeps a running animation's target.
      if (index !== current) targetPage.current = index;
      onPageChange(index);
      pagerRef.current?.scrollToOffset({ offset: index * width, animated: true });
    },
    [current, onPageChange, total, width],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: width, offset: width * index, index }),
    [width],
  );

  const pagerProps = useMemo(
    () => ({
      ref: pagerRef,
      horizontal: true,
      pagingEnabled: true,
      getItemLayout,
      onScroll,
      onScrollBeginDrag: release,
      onMomentumScrollEnd,
      scrollEventThrottle: 16,
    }),
    [getItemLayout, onMomentumScrollEnd, onScroll, release],
  );

  return { pagerProps, scrollToPage };
}
