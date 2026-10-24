import { useEffect } from "react";
import React from "react";
import { View, Pressable, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import {
  theme,
  Text,
  CountBadge,
  Icon,
  GlassSurface,
  getGlassView,
  usePressScale,
  useToastBottomInset,
  FLOATING_ACTION_ICON_SIZE,
  type IconName,
} from "@/ui";
import { useAuthStore } from "@/stores/authStore";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useShellCounts } from "./useShellCounts";
import {
  TAB_BAR_ANIM_MS,
  useTabBarCollapsed,
  useTabBarCollapsedFlag,
  useTabBarProgress,
} from "./TabBarCollapse";
import {
  TAB_PILL_HEIGHT,
  TAB_SELL_GAP,
  TAB_SELL_SIZE,
  tabBarRowWidth,
  tabPillBottomOffset,
} from "./tabBarLayout";
import {
  collapsedTabStartX,
  collapsedTabStyle,
  pillContentOpacity,
  sellButtonStyle,
  pillHideStyle,
} from "./tabBarScroll";
import { useTabHighlight } from "./useTabHighlight";

const { colors, spacing, iconSize, radius } = theme;

/** Seçili sekme hap/daire dolgusu: nötr açık gri (turuncu vurgu yok). */
const TAB_ACTIVE_FILL = colors.gray[100] as string;

export { TAB_BAR_ANIM_MS };

/** Gizlenirken hapın aşağı kayma payı ve küçülme oranı. */
const PILL_HIDE_TRANSLATE_Y = spacing[4];
const PILL_HIDE_SCALE = 0.9;
/** Hapın iç yatay dolgusu (daralmış sekme dairesinin başlangıç konumu da buna göre hesaplanır). */
const PILL_PADDING_X = spacing[1];

// Hap içindeki sekmeler (sırasıyla): Ana Sayfa, Favoriler, Sepet, Profil. href:null olan (create)
// kasıtlı olarak dışarıda; Mesajlar ve Bildirimler artık sekme değil, üst bardan açılan yığın rotaları
// (`ShellHeaderActions`). Rozet sayaçları `useShellCounts`'tan (tek kaynak). İkonlar web Heroicons
// adları; odaklı sekme `solid`, diğerleri `outline`.
const TABS = [
  { name: "index", testID: "tab-home", labelKey: "nav.home", icon: "home" as IconName, badge: null },
  { name: "favorites/index", testID: "tab-favorites", labelKey: "nav.favorites", icon: "heart" as IconName, badge: null },
  { name: "cart/index", testID: "tab-cart", labelKey: "nav.cart", icon: "shopping-cart" as IconName, badge: "cartCount" },
  { name: "profile", testID: "tab-profile", labelKey: "nav.profile", icon: "user" as IconName, badge: null },
] as const;
const SELL_ROUTE = "sell";
const HOME_ROUTE = "index";
type TabDef = (typeof TABS)[number];
/** Menünün gidebildiği sekme rotaları (`Tabs` ekran adları): hap sekmeleri + "+" (İlan Ver). */
export type TabBarRoute = TabDef["name"] | typeof SELL_ROUTE;

/**
 * Özel yüzen alt menü (düz RN View'lar): solda 4 sekmeli hap [Ana Sayfa][Favoriler][Sepet][Profil], sağında
 * AYRI yuvarlak "+" (İlan Ver) düğmesi; ikisi aynı alt hizada/yükseklikte. Yüzeyler `GlassSurface`:
 * iOS 26'da gerçek Liquid Glass (arkadaki içerik görünür), iOS < 26 / Android'de opak beyaz hap ve
 * opak beyaz "+" dairesi (ince border + gölge). İkon ve etiketler üst bar ikonlarıyla aynı başlık
 * renginde; seçili sekme dolu ikon + nötr gri hap ile ayrışır. İçerik aşağı kaydırılınca
 * (bkz. `useTabBarScrollHandler`) hap daralır; geride TEK öğe kalır, sekmeye göre:
 * - Ana Sayfa (ve hap dışı rotalar): "+" sağdan sola (alt sol köşe) kayar.
 * - Favoriler / Sepet / Profil: "+" gizlenir; o sekmenin seçili ikonu (rozetiyle) tek daire
 *   olarak hap içindeki yerinden sol alt köşeye kayar. Daireye dokununca hap yeniden açılır.
 * Yukarı kaydırınca hap geri gelir. Hap fallback'te opacity + translateY + scale ile; CAMDA opacity ile DEĞİL
 * (native cam ata opacity < 1 iken efektini kaybeder) aşağı kayıp ekran dışına çıkarak, içeriği
 * yüzeyin içinde soluklaşarak gizlenir. Animasyon UI thread'inde (tek `progress` türetilmiş değeri);
 * "reduce motion" açıkken anında geçer. Ekranların üstüne biner (`position:absolute`); içerik alt
 * dolgusunu `useTabBarInset` verir.
 *
 * SDK 54 / RN 0.81 + New Architecture'da @react-navigation/bottom-tabs default `BottomTabBar`'ı
 * RELEASE (Fabric) render'da bozuk çiziyordu (ikonlar sola yığılıyor + sağda testere deseni;
 * dev'de sorunsuz). Düz flex satırıyla o native yolu tamamen atlıyoruz.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <TabBarView
      activeName={state.routes[state.index]?.name}
      onNavigate={(name) => navigation.navigate(name)}
    />
  );
}

export interface TabBarViewProps {
  /**
   * `Tabs` route name of the focused tab. On a non-tab stack screen (`StackTabBar`: category, search,
   * manufacturer / brand / model products) it is `undefined`: no highlight, and when collapsed only
   * the "+" remains, like Home.
   */
  activeName?: string;
  /** Sekmeye / "+"ya dokunuş (odaktaki sekmeye dokunuşta çağrılmaz). */
  onNavigate: (name: TabBarRoute) => void;
}

/**
 * Menünün görünümü — navigasyondan bağımsız: `AppTabBar` (sekme kökleri, `Tabs` bağlamı) ve
 * `StackTabBar` (menülü yığın ekranları, rota tabanlı) aynı görünümü çizer.
 */
export function TabBarView({ activeName, onNavigate }: TabBarViewProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const counts = useShellCounts();
  const keyboardHeight = useKeyboardHeight();
  const { width: windowWidth } = useWindowDimensions();
  const collapsed = useTabBarCollapsed();
  // Gizli hap: dokunma + ekran okuyucu dışı (JS state; UI thread'inden scheduleOnRN ile).
  const pillHidden = useTabBarCollapsedFlag();
  const glass = getGlassView() !== null;

  // Sekme değişince ve oturum durumu değişince (ör. Profil üye <-> misafir görünümü) menü açık hale döner.
  const isAuthenticated = useAuthStore((st) => st.isAuthenticated);
  useEffect(() => {
    collapsed.value = false;
  }, [activeName, isAuthenticated, collapsed]);

  // 0 = açık, 1 = daralmış. Tek kaynak; animasyonlu stillerin hepsi bundan türer (eşzamanlı).
  const progress = useTabBarProgress();

  // Row (pill + "+"): window minus the side gaps, centred and capped on wide windows.
  const rowWidth = tabBarRowWidth(windowWidth);
  const rowInset = (windowWidth - rowWidth) / 2;
  // "+" travels from its place on the right to the row's left edge: row width - its own width.
  const sellTravel = Math.max(rowWidth - TAB_SELL_SIZE, 0);
  // Cam hap: alt kenarın ötesine tam kayar (yükseklik + alt boşluk + gölge payı).
  const glassHideY = TAB_PILL_HEIGHT + tabPillBottomOffset(insets.bottom) + spacing[4];

  const pillStyle = useAnimatedStyle(() =>
    pillHideStyle(glass, progress.value, PILL_HIDE_TRANSLATE_Y, glassHideY, PILL_HIDE_SCALE),
  );
  // Yalnız camda: içerik (ikon + etiket) cam yüzeyin İÇİNDE soluklaşır.
  const pillContentStyle = useAnimatedStyle(() => ({ opacity: pillContentOpacity(glass, progress.value) }));
  const highlight = useTabHighlight(TABS.some((tb) => tb.name === activeName) ? activeName : undefined);

  // Daralınca kalan öğe: Ana Sayfa'da (ve hap dışı rotalarda) "+", diğer sekmelerde o sekmenin dairesi.
  const collapsedTab = TABS.find((tb) => tb.name === activeName && tb.name !== HOME_ROUTE);
  const keepSell = !collapsedTab;
  const collapsedStartX = collapsedTabStartX(
    collapsedTab ? highlight.layouts[collapsedTab.name] : undefined,
    PILL_PADDING_X,
    TAB_SELL_SIZE,
  );
  const collapsedTabAnimStyle = useAnimatedStyle(() =>
    collapsedTabStyle(glass, progress.value, collapsedStartX, PILL_HIDE_TRANSLATE_Y, glassHideY, PILL_HIDE_SCALE),
  );
  // "+" gizliyken (sekme dairesi modunda daralmış) dokunma + ekran okuyucu dışı.
  const sellHidden = pillHidden && !keepSell;

  const sellPress = usePressScale();
  const sellStyle = useAnimatedStyle(() =>
    sellButtonStyle(keepSell, glass, progress.value, sellTravel, PILL_HIDE_TRANSLATE_Y, glassHideY, PILL_HIDE_SCALE),
  );

  // Toast yüzen hapın üstünde dursun (kök toast katmanına engel olarak bildirilir). Daralmış öğe ("+" ya
  // da sekme dairesi) hapla aynı yükseklikte ve alt hizada: inset daralınca da aynı. Klavye açıkken
  // hap gizli: toast klavyenin üstüne iner.
  useToastBottomInset(keyboardHeight > 0 ? null : TAB_PILL_HEIGHT + tabPillBottomOffset(insets.bottom));

  // Klavye açıkken menü formun üstüne binmesin (hook'lar yukarıda, sıra sabit).
  if (keyboardHeight > 0) return null;

  const sellFocused = activeName === SELL_ROUTE;
  const sellLabel = t("mobile.tabBarSell");

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: tabPillBottomOffset(insets.bottom), left: rowInset, right: rowInset }]}
      testID="app-tab-bar"
    >
      <Animated.View
        style={[styles.pillWrap, pillStyle]}
        pointerEvents={pillHidden ? "none" : "auto"}
        accessibilityElementsHidden={pillHidden}
        importantForAccessibility={pillHidden ? "no-hide-descendants" : "auto"}
        testID="app-tab-pill"
      >
        <GlassSurface shape="pill" size={TAB_PILL_HEIGHT} opaque style={styles.pill}>
          <Animated.View style={[styles.pillContent, pillContentStyle]}>
            {/* Aktif sekme vurgusu: sekmeler arasında kayar (x / genişlik ölçümle). */}
            <Animated.View
              pointerEvents="none"
              testID="tab-highlight"
              style={[styles.highlight, highlight.style]}
            />
            {TABS.map((tab) => {
              const focused = activeName === tab.name;
              // Etiket/ikon üst bar ikonlarıyla aynı renk (başlık rengi); seçili sekme dolu ikon + nötr hap ile ayrışır.
              const color = colors.text.heading;
              const label = t(tab.labelKey);

              return (
                <TabItem
                  key={tab.name}
                  testID={tab.testID}
                  accessibilityLabel={label}
                  focused={focused}
                  onLayout={highlight.onItemLayout(tab.name)}
                  onPress={() => {
                    if (!focused) onNavigate(tab.name);
                  }}
                >
                  <View>
                    <Icon name={tab.icon} variant={focused ? "solid" : "outline"} size={iconSize.lg} color={color} />
                    {tab.badge && (
                      <CountBadge
                        count={counts[tab.badge]}
                        ringColor={focused ? TAB_ACTIVE_FILL : colors.surface.elevated}
                        style={styles.badge}
                      />
                    )}
                  </View>
                  <Text
                    variant="caption"
                    weight="semibold"
                    color={color}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    maxFontSizeMultiplier={theme.typography.maxFontScale.control}
                    style={styles.label}
                  >
                    {label}
                  </Text>
                </TabItem>
              );
            })}
          </Animated.View>
        </GlassSurface>
      </Animated.View>

      {collapsedTab ? (
        <Animated.View
          style={[styles.collapsedWrap, collapsedTabAnimStyle]}
          pointerEvents={pillHidden ? "auto" : "none"}
          accessibilityElementsHidden={!pillHidden}
          importantForAccessibility={pillHidden ? "auto" : "no-hide-descendants"}
          testID="tab-collapsed-wrap"
        >
          <CollapsedTabButton
            tab={collapsedTab}
            label={t(collapsedTab.labelKey)}
            hint={t("mobile.tabBarExpandHint")}
            count={collapsedTab.badge ? counts[collapsedTab.badge] : 0}
            glass={glass}
            onPress={() => {
              collapsed.value = false;
            }}
          />
        </Animated.View>
      ) : null}

      <Animated.View
        style={[styles.sellWrap, sellStyle]}
        pointerEvents={sellHidden ? "none" : "auto"}
        accessibilityElementsHidden={sellHidden}
        importantForAccessibility={sellHidden ? "no-hide-descendants" : "auto"}
        testID="tab-sell-wrap"
      >
        <Pressable
          testID="tab-sell"
          style={styles.sellButton}
          accessibilityRole="button"
          accessibilityLabel={sellLabel}
          accessibilityState={{ selected: sellFocused }}
          onPressIn={sellPress.onPressIn}
          onPressOut={sellPress.onPressOut}
          onPress={() => {
            if (!sellFocused) onNavigate(SELL_ROUTE);
          }}
        >
          <Animated.View style={sellPress.style}>
            {/* Camda interaktif cam: pointerEvents none yalnız fallback'te (native efekt dokunuşu ister). */}
            <GlassSurface
              shape="circle"
              size={TAB_SELL_SIZE}
              opaque
              interactive
              pointerEvents={glass ? undefined : "none"}
            >
              <Icon name="plus" size={FLOATING_ACTION_ICON_SIZE} color={colors.text.heading} />
            </GlassSurface>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

interface CollapsedTabButtonProps {
  tab: TabDef;
  label: string;
  hint: string;
  count: number;
  glass: boolean;
  onPress: () => void;
}

/**
 * Daralmış hapın yerine kalan TEK sekme dairesi (Favoriler / Sepet / Profil): "+" ile aynı boyut
 * ve cam yüzey (fallback'te opak beyaz + kenarlık + gölge / Android elevation); içinde hap vurgusuyla
 * aynı primary-50 iç daire + seçili (solid, primary-600) ikon + varsa rozet. Dokununca hap açılır.
 */
function CollapsedTabButton({ tab, label, hint, count, glass, onPress }: CollapsedTabButtonProps) {
  const press = usePressScale();
  return (
    <Pressable
      testID="tab-collapsed"
      style={styles.sellButton}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected: true }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
    >
      <Animated.View style={press.style}>
        {/* Camda interaktif cam ("+" ile aynı); pointerEvents none yalnız fallback'te. */}
        <GlassSurface
          shape="circle"
          size={TAB_SELL_SIZE}
          opaque
          interactive
          pointerEvents={glass ? undefined : "none"}
        >
          <View style={styles.collapsedInner}>
            <View>
              <Icon name={tab.icon} variant="solid" size={iconSize.lg} color={colors.text.heading} />
              {tab.badge ? (
                <CountBadge
                  count={count}
                  ringColor={TAB_ACTIVE_FILL}
                  style={styles.badge}
                  testID="tab-collapsed-badge"
                />
              ) : null}
            </View>
          </View>
        </GlassSurface>
      </Animated.View>
    </Pressable>
  );
}

interface TabItemProps {
  testID: string;
  accessibilityLabel: string;
  focused: boolean;
  onLayout: (e: LayoutChangeEvent) => void;
  onPress: () => void;
  children: React.ReactNode;
}

/** Hap sekmesi: dokunma alanı sabit; basınca yalnız içerik (ikon + etiket) hafifçe küçülür. */
function TabItem({ testID, accessibilityLabel, focused, onLayout, onPress, children }: TabItemProps) {
  const press = usePressScale();
  return (
    <Pressable
      testID={testID}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: focused }}
      onLayout={onLayout}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.itemContent, press.style]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // `left` / `right` come from the row width (`tabBarRowWidth`): the side gap on phones.
    position: "absolute",
    height: TAB_PILL_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
  },
  pillWrap: {
    flex: 1,
    height: TAB_PILL_HEIGHT,
  },
  // Yüzey (cam / opak beyaz + kenarlık + gölge) `GlassSurface`'ten; burada yalnız yerleşim.
  pill: {
    alignSelf: "stretch",
    paddingHorizontal: PILL_PADDING_X,
  },
  pillContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
  },
  item: {
    flex: 1,
    height: TAB_PILL_HEIGHT - 2 * spacing[2],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  // Aktif sekme vurgusu (sekmeler arasında kayar): nötr açık gri hap (cam ve fallback'te aynı;
  // etiket/ikon başlık renginde kalır, kontrast korunur). Konum/genişlik animasyonlu stilden
  // (`useTabHighlight`); burada yalnız sabit kısım.
  highlight: {
    position: "absolute",
    left: 0,
    top: spacing[2],
    height: TAB_PILL_HEIGHT - 2 * spacing[2],
    borderRadius: radius.full,
    backgroundColor: TAB_ACTIVE_FILL,
  },
  itemContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  sellWrap: {
    marginLeft: TAB_SELL_GAP,
  },
  // Daralmış sekme dairesi: satırın sol alt köşesi ("+"nın daraldığı yer); x kayması animasyonlu stilden.
  collapsedWrap: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  // Hap vurgusuyla aynı iç daire (TAB_ACTIVE_FILL): seçili sekme görünümü daralınca da korunur.
  collapsedInner: {
    width: TAB_PILL_HEIGHT - 2 * spacing[2],
    height: TAB_PILL_HEIGHT - 2 * spacing[2],
    borderRadius: radius.full,
    backgroundColor: TAB_ACTIVE_FILL,
    alignItems: "center",
    justifyContent: "center",
  },
  // "+" diğer cam düğmelerle aynı nötr yüzey, ikon başlık renginde: yüzeyi GlassSurface çizer.
  sellButton: {
    width: TAB_SELL_SIZE,
    height: TAB_SELL_SIZE,
    borderRadius: radius.full,
  },
  // Etiket boyu ölçekten bağımsız rol (`theme.tabBarLabel`): hap genişliğine sığar.
  label: {
    marginTop: spacing[0.5],
    ...theme.tabBarLabel,
  },
  badge: {
    top: -spacing[1],
    right: -spacing[2.5],
  },
});
