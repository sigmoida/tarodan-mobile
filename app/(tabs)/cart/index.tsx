import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Checkbox, EmptyState, Text, theme, usePageGutter, useToastBottomInset, usePageScrollValue, usePageOffsetHandler } from '@/ui';
import { searchEntryHref } from '@/lib/navigation/searchHref';
import { tabDiag } from '@/components/_tabDiag';
import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset, useTabBarTop } from '@/components/shell/tabBarLayout';
import { useCart } from './_hooks/useCart';
import { styles } from './_lib/styles';
import { CartItemRow } from './_components/CartItemRow';
import { CartSummary } from './_components/CartSummary';
import { CartCheckoutAction, CartCheckoutBar } from './_components/CartCheckoutBar';
import { useCartLayout } from './_lib/layout';

const { spacing } = theme;

/**
 * Sepet — sekme kökü (alt menüde Favoriler'den sonra; `/cart` derin bağlantısı da buraya açılır).
 * Web CartClient'ın telefon görünümü: AppShell başlığı "Sepetim" (alt başlıkta ürün sayısı), toplu
 * seçim, satır kartları, sipariş özeti kartı; "Ödemeye Geç" yüzen alt menünün üstündeki sabit
 * çubukta (toplamla birlikte). Kaydırma alt menüyü daraltır. Mantık `useCart`'ta.
 * Large screens (`cartLayout`, layout only): medium keeps one column with a wide floating bar;
 * expanded and up put the summary and the checkout action in a right-hand panel.
 */
function CartScreen() {
  const { t } = useTranslation();
  const f = useCart();
  // Hook sırası sabit kalsın diye erken return'den ÖNCE (app/CLAUDE.md › Thin screens).
  const tabInset = useTabBarInset();
  const tabTop = useTabBarTop();
  const page = usePageScrollValue();
  // The list feeds the top bar scroll edge (the tab bar is fixed: no collapse).
  const onPageScroll = usePageOffsetHandler(page.scrollY);
  const [barHeight, setBarHeight] = useState(0);
  const hasItems = f.items.length > 0;
  const layout = useCartLayout();
  const gutter = usePageGutter();
  // The floating bar exists only in one-column layouts; its height pads the list and lifts the toast.
  const barInset = layout.twoColumn ? 0 : barHeight;
  // Large screens: edge to edge with the tablet gutter; the checkout bar follows it. Memoised: the
  // cart re-renders on every quote and selection change.
  const { contentStyle: withTopInset } = page;
  // One column: the page gutter on both sides, the bottom clears the tab bar and the checkout bar.
  const columnStyle = useMemo(
    () => withTopInset([styles.content, { paddingHorizontal: gutter, paddingBottom: tabInset + barInset + spacing[2] }]),
    [withTopInset, gutter, tabInset, barInset],
  );
  // Two columns: the items keep the left gutter, the panel brings the gap and the right gutter.
  const itemsStyle = useMemo(
    () => withTopInset([styles.content, { paddingLeft: gutter, paddingRight: 0, paddingBottom: tabInset }]),
    [withTopInset, gutter, tabInset],
  );
  const panelStyle = useMemo(
    () => withTopInset([styles.content, { paddingHorizontal: gutter, paddingBottom: tabInset }]),
    [withTopInset, gutter, tabInset],
  );
  // Toast ödeme çubuğunun üstünde dursun (alt menünün kaydından sonra bağlanır → öncelikli).
  useToastBottomInset(hasItems && barInset > 0 ? tabTop + spacing[2] + barInset : null);

  if (!hasItems) {
    return (
      <AppShell variant="title" title={t('cart.myCart')}>
        <EmptyState
          icon="shopping-cart"
          title={t('cart.empty')}
          subtitle={t('cart.emptyDesc')}
          actionLabel={t('cart.browseListings')}
          onAction={() => router.push(searchEntryHref('all'))}
        />
      </AppShell>
    );
  }

  // Select-all and the item cards: the items column (two columns) or the one scroll body.
  const items = (
    <>
      {/* Toplu seçim — sepette birden fazla satır varken anlamlı. */}
      {f.items.length > 1 ? (
        <View style={styles.selectAllRow}>
          <Checkbox
            testID="cart-select-all"
            checked={f.allSelected}
            onChange={f.toggleSelectAll}
            label={t('cart.selectAllItems')}
          />
          <Text variant="bodySm" tone="muted" style={styles.selectAllCount}>
            {t('cart.selectedCount', { count: f.selectedCount })}
          </Text>
        </View>
      ) : null}

      {f.items.map((item) => (
        <CartItemRow key={item.id} item={item} f={f} />
      ))}
    </>
  );

  return (
    <AppShell
      variant="title"
      title={t('cart.myCart')}
      subtitle={`${f.itemCount} ${t('collection.items')}`}
      scroll={page}
    >
      {layout.twoColumn ? (
        <View style={styles.twoColumn} testID="cart-two-column">
          <Animated.ScrollView
            onScroll={onPageScroll}
            {...page.scrollProps}
            scrollEventThrottle={16}
            testID="cart-scroll"
            style={styles.itemsColumn}
            contentContainerStyle={itemsStyle}
            showsVerticalScrollIndicator={false}
          >
            {items}
          </Animated.ScrollView>
          {/* Own scroll: the summary and the checkout action stay in view while the items scroll. */}
          <ScrollView
            {...page.scrollProps}
            testID="cart-summary-panel"
            style={styles.summaryColumn}
            contentContainerStyle={panelStyle}
            showsVerticalScrollIndicator={false}
          >
            <CartSummary f={f} />
            <View style={styles.checkoutCard} testID="cart-panel-checkout">
              <CartCheckoutAction f={f} />
            </View>
          </ScrollView>
        </View>
      ) : (
        <>
          <Animated.ScrollView
            onScroll={onPageScroll}
            {...page.scrollProps}
            scrollEventThrottle={16}
            testID="cart-scroll"
            contentContainerStyle={columnStyle}
            showsVerticalScrollIndicator={false}
          >
            {items}
            <CartSummary f={f} />
          </Animated.ScrollView>
          <CartCheckoutBar
            f={f}
            wide={layout.wideBar}
            bottom={tabTop + spacing[2]}
            onLayout={(e) => setBarHeight(Math.ceil(e.nativeEvent.layout.height))}
          />
        </>
      )}
    </AppShell>
  );
}

export default tabDiag('cart', CartScreen);
