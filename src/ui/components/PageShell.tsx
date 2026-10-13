import React from 'react';
import {
  KeyboardAvoidingView,
  RefreshControl,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ShellScrollProvider,
  useResetScrollOnBind,
  useShellScrollState,
  type PageScrollValue,
} from '../lib/pageScroll';
import { theme } from '../lib/theme';
import { useKeyboardAvoid } from '../lib/keyboard';
import { ScreenHeader, type ScreenHeaderProps } from './ScreenHeader';
import { EmptyState, type EmptyStateProps } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ScreenLoader } from './ScreenLoader';
import { SkeletonText } from './Skeleton';
import { useToastBottomInset } from './Toast';

/** Sayfa kenar boşluğu (web telefon `px-4`) ve bölüm aralığı (web PageShell `space-y-4`). */
export const PAGE_GUTTER = theme.spacing[4];
export const PAGE_SECTION_GAP = theme.spacing[4];

/** `mode="list"` ekranların FlatList'i için hazır içerik stili (gutter + bölüm aralığı). */
export const pageListContentStyle: ViewStyle = {
  padding: PAGE_GUTTER,
  gap: PAGE_SECTION_GAP,
};

export type PageShellMode = 'scroll' | 'list' | 'static';

export interface PageShellProps
  extends Pick<
      ScreenHeaderProps,
      'subtitle' | 'onBack' | 'showBack' | 'right' | 'centerTitle' | 'leading' | 'titleSlot'
    > {
  /** Üst bar başlığı. `header` verilmezse beyaz üst bar bununla çizilir. */
  title?: string;
  /** Üst barın yerine özel düğüm; `false` = üst bar yok (ör. tam ekran akış). */
  header?: React.ReactNode | false;
  /**
   * Gövde: `scroll` (varsayılan; ScrollView + gutter + bölüm aralığı), `list` (çocuk kendi
   * FlatList'ini getirir — `pageListContentStyle` kullanın), `static` (kaymayan View).
   */
  mode?: PageShellMode;
  children?: React.ReactNode;
  /** Sabit alt bar (ana aksiyon) — üst çizgili, güvenli alan dahil. */
  footer?: React.ReactNode;
  /**
   * Modallar / sheet'ler / Snackbar için HER ZAMAN render edilen slot. `loading` ya da `error`
   * durumunda `children` unmount edilir; açık bir form modalı `children` içinde olursa o anda
   * kapanır ve girilen veri kaybolur. Ekran modallarını `children` DEĞİL buraya koyar.
   */
  overlay?: React.ReactNode;
  /**
   * `list` / `static` modunda ekranın kendi kaydırılabilir listesinin sinyali (`usePageScrollHandler()`):
   * verilirse gövde bar ALTINDAN değil ekran tepesinden başlar (içerik yüzen barın altından kayar),
   * liste `scroll.scrollProps` + `contentStyle` ile üst boşluğu kendisi açar ve kenar efekti
   * kaydırmaya bağlanır. Verilmezse gövde bar altında başlar ve kenar efekti SABİT şerittir.
   * `scroll` modunda yok sayılır (PageShell kendi ScrollView'ını bağlar).
   */
  scroll?: PageScrollValue;
  /**
   * Klavye açılınca gövde ve alt bar yukarı kaçar (varsayılan açık). iOS `KeyboardAvoidingView`
   * (`padding`), Android ölçülen klavye örtüşmesi kadar alt dolgu (`useKeyboardAvoid`). Klavye
   * açıkken alt çubuk güvenli alan boşluğunu eklemez (klavyenin hemen üstünde durur).
   */
  keyboardAware?: boolean;
  /** Yükleniyor: varsayılan Skeleton (liste/kart), `spinner` yalnız ilk açılışta. */
  loading?: boolean;
  loadingVariant?: 'skeleton' | 'spinner';
  /** Özel yükleniyor görünümü (ör. ekranın kendi kart iskeleti). */
  loadingFallback?: React.ReactNode;
  /** Boş durum: true ise `emptyState` çizilir. */
  empty?: boolean;
  emptyState?: EmptyStateProps;
  /** Hata: truthy ise ErrorState (+ `onRetry`). */
  error?: unknown;
  onRetry?: () => void;
  errorTitle?: string;
  errorMessage?: string;
  /** `scroll` modunda çekip yenileme. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Gövde iç boşluğu (spacing anahtarı) ya da `false`. Varsayılan 4 (16pt). */
  padding?: keyof typeof theme.spacing | false;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const { colors, spacing } = theme;

/**
 * Yığın ekranlarının kabuğu (web PageShell + Header'ın sade beyaz karşılığı): beyaz üst bar,
 * surface zemin, gövde (scroll | list | static), opsiyonel sabit alt bar, güvenli alan,
 * klavye kaçınma ve yükleniyor / boş / hata durumları. Ekran yalnız içeriğini verir.
 *
 * Uygulamada `@/components/common/PageShell` kullanın: geri okuna router varsayılanını ekler.
 */
export const PageShell: React.FC<PageShellProps> = ({
  title,
  subtitle,
  onBack,
  showBack,
  right,
  centerTitle,
  leading,
  titleSlot,
  header,
  mode = 'scroll',
  children,
  footer,
  overlay,
  scroll,
  keyboardAware = true,
  loading = false,
  loadingVariant = 'skeleton',
  loadingFallback,
  empty = false,
  emptyState,
  error,
  onRetry,
  errorTitle,
  errorMessage,
  refreshing = false,
  onRefresh,
  padding = 4,
  contentStyle,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const pad = padding === false ? 0 : spacing[padding];
  const keyboard = useKeyboardAvoid(keyboardAware);

  // Özel `header` akışta çizilir (ör. sohbet: opak, floating={false}); `false` = bar yok; aksi halde YÜZEN bar.
  const customHeader = header !== undefined && header !== false;
  const hasBar = header === undefined;
  const contentVisible = !error && !loading && !(empty && emptyState);
  const shell = useShellScrollState(scroll, mode === 'scroll');
  const { own } = shell;
  // İçerik bar altından kayıyor mu? (scroll modu kendi ScrollView'ını bağlar; list/static: ekran/çocuk bağladıysa)
  const underBar = hasBar && contentVisible && shell.bound;
  const barInset = hasBar ? own.topInset : 0;
  const edgeY = mode === 'scroll' ? own.scrollY : shell.page.scrollY;
  // Liste (yeniden) bağlanınca (loading → içerik) bayat ofset şeridi opak bırakmasın.
  useResetScrollOnBind(edgeY, underBar);

  const topBar = customHeader ? (
    header
  ) : hasBar ? (
    <ScreenHeader
      title={title ?? ''}
      subtitle={subtitle}
      onBack={onBack}
      showBack={showBack}
      right={right}
      centerTitle={centerTitle}
      leading={leading}
      titleSlot={titleSlot}
      scrollY={underBar ? edgeY : undefined}
    />
  ) : null;

  let body: React.ReactNode;
  let showFooter = !!footer;
  if (error) {
    showFooter = false;
    body = (
      <ErrorState title={errorTitle} message={errorMessage} onRetry={onRetry} />
    );
  } else if (loading) {
    showFooter = false;
    body =
      loadingFallback ??
      (loadingVariant === 'spinner' ? (
        <ScreenLoader />
      ) : (
        <View style={[styles.skeleton, { padding: pad || PAGE_GUTTER }]} testID="page-shell-skeleton">
          <SkeletonText lines={2} />
          <SkeletonText lines={3} />
          <SkeletonText lines={3} />
        </View>
      ));
  } else if (empty && emptyState) {
    body = <EmptyState {...emptyState} />;
  } else if (mode === 'scroll') {
    body = (
      <Animated.ScrollView
        style={styles.fill}
        contentContainerStyle={
          hasBar
            ? own.contentStyle([styles.scrollContent, { padding: pad }, contentStyle])
            : [styles.scrollContent, { padding: pad }, contentStyle]
        }
        keyboardShouldPersistTaps="handled"
        onScroll={own.onScroll}
        scrollEventThrottle={own.scrollEventThrottle}
        {...(hasBar ? own.scrollProps : null)}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary[600]]}
              tintColor={colors.primary[600]}
              progressViewOffset={barInset}
            />
          ) : undefined
        }
      >
        {children}
      </Animated.ScrollView>
    );
  } else if (mode === 'static') {
    body = <View style={[styles.fill, { padding: pad }, contentStyle]}>{children}</View>;
  } else {
    body = <View style={[styles.fill, contentStyle]}>{children}</View>;
  }

  // Alt çubuk varken toast onun üstünde dursun (kök toast katmanına bildirilir; klavye kaçışı açıkken
  // çubuk iki platformda da klavyenin üstüne çıkar, toast da onunla).
  const [footerHeight, setFooterHeight] = React.useState(0);
  useToastBottomInset(showFooter && footerHeight > 0 ? footerHeight : null, keyboardAware);

  // Bar altından kaymayan gövde (yükleniyor / boş / hata / bağlanmamış liste) bar kadar aşağıdan başlar.
  const content = (
    <>
      <View style={[styles.fill, hasBar && !underBar && { paddingTop: barInset }]}>{body}</View>
      {showFooter ? (
        <View
          // Klavye açıkken çubuk klavyenin üstünde: güvenli alan (home indicator / gezinti çubuğu)
          // klavyenin altında kalır, eklenirse klavye üstünde boş şerit olur.
          style={[styles.footer, { paddingBottom: spacing[3] + (keyboard.keyboardOpen ? 0 : insets.bottom) }]}
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
          testID="page-shell-footer"
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.root} testID={testID}>
      {customHeader ? topBar : null}
      <ShellScrollProvider value={shell.ctx}>
        {keyboardAware && keyboard.behavior ? (
          <KeyboardAvoidingView style={styles.fill} behavior={keyboard.behavior}>
            {content}
          </KeyboardAvoidingView>
        ) : keyboardAware ? (
          <View
            style={[styles.fill, { paddingBottom: keyboard.bottomInset }]}
            onLayout={keyboard.onLayout}
            testID="page-shell-keyboard"
          >
            {content}
          </View>
        ) : (
          content
        )}
      </ShellScrollProvider>
      {customHeader ? null : topBar}
      {overlay}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: PAGE_SECTION_GAP,
  },
  skeleton: {
    gap: spacing[6],
  },
  footer: {
    backgroundColor: colors.surface.elevated,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: spacing[3],
    gap: spacing[2],
  },
});
