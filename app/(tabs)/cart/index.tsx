import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Checkbox, EmptyState, Text, theme, usePageContentStyle, useToastBottomInset, usePageScrollValue } from '@/ui';
import { searchEntryHref } from '@/lib/navigation/searchHref';
import { tabDiag } from '@/components/_tabDiag';
import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset, useTabBarTop } from '@/components/shell/tabBarLayout';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';
import { useCart } from './_hooks/useCart';
import { styles } from './_lib/styles';
import { CartItemRow } from './_components/CartItemRow';
import { CartSummary } from './_components/CartSummary';
import { CartCheckoutBar } from './_components/CartCheckoutBar';

const { spacing } = theme;

/**
 * Sepet — sekme kökü (alt menüde Favoriler'den sonra; `/cart` derin bağlantısı da buraya açılır).
 * Web CartClient'ın telefon görünümü: AppShell başlığı "Sepetim" (alt başlıkta ürün sayısı), toplu
 * seçim, satır kartları, sipariş özeti kartı; "Ödemeye Geç" yüzen alt menünün üstündeki sabit
 * çubukta (toplamla birlikte). Kaydırma alt menüyü daraltır. Mantık `useCart`'ta.
 */
function CartScreen() {
  const { t } = useTranslation();
  const f = useCart();
  // Hook sırası sabit kalsın diye erken return'den ÖNCE (app/CLAUDE.md › Thin screens).
  const tabInset = useTabBarInset();
  const tabTop = useTabBarTop();
  const page = usePageScrollValue();
  const tabScroll = useTabBarScrollHandler(undefined, page.scrollY);
  const [barHeight, setBarHeight] = useState(0);
  const hasItems = f.items.length > 0;
  // Large screens: edge to edge with the tablet gutter; the checkout bar follows it.
  const contentStyle = usePageContentStyle([styles.content, { paddingBottom: tabInset + barHeight + spacing[2] }]);
  // Toast ödeme çubuğunun üstünde dursun (alt menünün kaydından sonra bağlanır → öncelikli).
  useToastBottomInset(hasItems && barHeight > 0 ? tabTop + spacing[2] + barHeight : null);

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

  return (
    <AppShell
      variant="title"
      title={t('cart.myCart')}
      subtitle={`${f.itemCount} ${t('collection.items')}`}
      scroll={page}
    >
      <Animated.ScrollView
        {...tabScroll}
        {...page.scrollProps}
        scrollEventThrottle={16}
        testID="cart-scroll"
        contentContainerStyle={page.contentStyle(contentStyle)}
        showsVerticalScrollIndicator={false}
      >
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

        <CartSummary f={f} />
      </Animated.ScrollView>
      <CartCheckoutBar
        f={f}
        bottom={tabTop + spacing[2]}
        onLayout={(e) => setBarHeight(Math.ceil(e.nativeEvent.layout.height))}
      />
    </AppShell>
  );
}

export default tabDiag('cart', CartScreen);
