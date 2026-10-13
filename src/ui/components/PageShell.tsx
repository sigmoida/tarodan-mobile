import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { ScreenHeader, type ScreenHeaderProps } from './ScreenHeader';
import { EmptyState, type EmptyStateProps } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ScreenLoader } from './ScreenLoader';
import { SkeletonText } from './Skeleton';

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
  /** Klavye açılınca gövde ve alt bar yukarı kaçar (varsayılan açık). */
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

  const topBar =
    header === false ? null : header !== undefined ? (
      header
    ) : (
      <ScreenHeader
        title={title ?? ''}
        subtitle={subtitle}
        onBack={onBack}
        showBack={showBack}
        right={right}
        centerTitle={centerTitle}
        leading={leading}
        titleSlot={titleSlot}
      />
    );

  let body: React.ReactNode;
  let showFooter = !!footer;
  if (error) {
    showFooter = false;
    body = (
      <ErrorState fullscreen title={errorTitle} message={errorMessage} onRetry={onRetry} />
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
    body = <EmptyState fullscreen {...emptyState} />;
  } else if (mode === 'scroll') {
    body = (
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.scrollContent, { padding: pad }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary[600]]}
              tintColor={colors.primary[600]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    );
  } else if (mode === 'static') {
    body = <View style={[styles.fill, { padding: pad }, contentStyle]}>{children}</View>;
  } else {
    body = <View style={[styles.fill, contentStyle]}>{children}</View>;
  }

  const content = (
    <>
      <View style={styles.fill}>{body}</View>
      {showFooter ? (
        <View
          style={[styles.footer, { paddingBottom: spacing[3] + insets.bottom }]}
          testID="page-shell-footer"
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.root} testID={testID}>
      {topBar}
      {keyboardAware ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
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
