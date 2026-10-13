/**
 * BoostModal — İlanı öne çıkar (boost): süre/fiyat seç → ödeme başlat → /payment/[id].
 * Web BoostModal ile birebir akış. Backend: GET /products/:id/boost/options
 * (paket modeli; web ile aynı kaynak), eski kurulumlarda GET /products/boost/pricing'e
 * düşer. POST /products/:id/boost/initiate.
 *
 * Alttan açılan `BottomSheet`: gövdede paket/süre radyoları, sabit footer'da toplam fiyat +
 * [Öne Çıkar ve Öde]. Ödeme ekranına yönlendirme sheet TAMAMEN kapandıktan sonra çalışır
 * (`runAfterClose`, CLAUDE.md §12 iOS donma kuralı).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { qk } from '@/lib/query';
import {
  Alert,
  BottomSheet,
  Button,
  EmptyState,
  ListRowCard,
  RadioIndicator,
  Spinner,
  Switch,
  Text,
  theme,
  useBottomSheet,
} from '@/ui';
import { productsApi } from '@/lib/api';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { formatPrice } from '@/utils/format';

const { colors, spacing } = theme;

interface BoostOption {
  durationDays: number;
  price: number;
  label: string;
  /** Paket modelinden geldiyse initiate'e geri gönderilir. */
  packageId?: string;
}

/** Paket yanıtını (packages[].durations[]) düz süre listesine indirger; backend
 *  eski düz-fiyat şeklini döndürdüyse onu olduğu gibi geçirir. */
function normalizeBoostOptions(data: any, t: TFunction): BoostOption[] {
  if (Array.isArray(data?.packages)) {
    return data.packages.flatMap((pkg: any) =>
      (pkg.durations ?? []).map((d: any) => {
        const days = t('membership.daysCount', { count: d.durationDays });
        return {
          durationDays: d.durationDays,
          price: d.price,
          label: pkg.name ? `${pkg.name} · ${days}` : days,
          packageId: pkg.id,
        };
      }),
    );
  }
  return Array.isArray(data?.options) ? data.options : [];
}

interface BoostModalProps {
  visible: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  /** İlanın mevcut boost bitiş tarihi (varsa) — kalan süre + uzatma bilgisi için */
  boostedUntil?: string | null;
  /** Premium kullanıcı — "otomatik yenileme" premium'a özel */
  isPremium?: boolean;
}

type RunAfterClose = (fn: () => void) => void;

export function BoostModal({
  visible,
  onClose,
  listingId,
  listingTitle,
  boostedUntil,
  isPremium = false,
}: BoostModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const [autoRenew, setAutoRenew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /** Önce ilana özel paket seçenekleri; boş dönerse eski düz-fiyat ucuna düşer. */
  const { data, isLoading: loadingPricing } = useQuery({
    queryKey: qk.products.boostOptions(listingId),
    enabled: visible && !!listingId,
    queryFn: async () => {
      try {
        const res = await productsApi.getBoostOptions(listingId);
        const opts = normalizeBoostOptions(res?.data ?? {}, t);
        if (opts.length) return { options: opts, enabled: (res?.data as any)?.enabled !== false };
      } catch {
        // paket ucu yoksa/erişilemiyorsa aşağıdaki eski akışa düş
      }
      try {
        const res = await productsApi.getBoostPricing();
        const body: any = res?.data ?? {};
        return {
          options: normalizeBoostOptions(body, t),
          enabled: body.enabled !== false,
        };
      } catch {
        return { options: [] as BoostOption[], enabled: false };
      }
    },
  });

  const options = useMemo(() => data?.options ?? [], [data]);
  const enabled = data?.enabled ?? true;

  // Seçenekler gelince varsayılanı seç (7 gün varsa o, yoksa ilki).
  useEffect(() => {
    if (!options.length) return;
    setSelected((current) =>
      current != null && options.some((o) => o.durationDays === current)
        ? current
        : (options.find((o) => o.durationDays === 7) ?? options[0]).durationDays,
    );
  }, [options]);

  const remainingDays = boostedUntil
    ? Math.max(0, Math.ceil((new Date(boostedUntil).getTime() - Date.now()) / 86400000))
    : 0;
  const hasActiveBoost = remainingDays > 0;
  const chosen = options.find((o) => o.durationDays === selected);

  const handleConfirm = async (runAfterClose: RunAfterClose) => {
    if (selected == null || submitting) return;
    setSubmitting(true);
    try {
      const res = await productsApi.initiateBoost(listingId, {
        durationDays: selected,
        // Paket modelinden seçildiyse packageId gönderilir; yoksa eski düz-fiyat akışı.
        ...(chosen?.packageId ? { packageId: chosen.packageId } : {}),
        autoRenew: isPremium ? autoRenew : false,
        provider: 'paytr',
      });
      const data: any = res?.data?.data ?? res?.data ?? {};
      const paymentId = data.paymentId || data.id || data.payment?.id;
      // initiateBoost zaten PayTR token + URL üretip döndürür. URL'i ödeme ekranına
      // geçiriyoruz ki ekran tekrar initiate/retry ETMESİN (retry pending ödemeyi
      // reddediyor → "Sadece başarısız ödemeler tekrar denenebilir" hatası). Checkout
      // ile aynı pattern: tek kullanımlık token boşa harcanmaz.
      const paymentUrl: string | undefined = data.paymentUrl;
      if (paymentId) {
        setSubmitting(false);
        // Önce sheet kapanır, yönlendirme kapanış bittikten sonra (iOS donma kuralı §12).
        runAfterClose(() =>
          router.push({
            pathname: '/payment/[id]',
            params: {
              id: String(paymentId),
              provider: 'paytr',
              guest: '0',
              type: 'boost',
              ...(paymentUrl ? { paymentUrl } : {}),
            },
          } as any),
        );
        return;
      }
      throw new Error('payment-id-missing');
    } catch {
      setSubmitting(false);
    }
  };

  const confirmDisabled = submitting || loadingPricing || !enabled || selected == null;

  // Emniyet kilidi: uygulama içi dijital satış yok (iOS Guideline 3.1.1, Play ödeme politikası).
  // Hook sırası bozulmasın diye erken çıkış tüm hook'lardan SONRA, JSX
  // döndürülmeden hemen önce yapılır.
  if (!CAN_BUY_DIGITAL) return null;

  return (
    <BottomSheet
      isOpen={visible}
      onClose={onClose}
      title={t('boost.title')}
      testID="boost-sheet"
      footer={
        <BoostFooter
          price={chosen?.price}
          disabled={confirmDisabled}
          submitting={submitting}
          label={hasActiveBoost ? t('boost.extendAndPay') : t('boost.boostAndPay')}
          onConfirm={handleConfirm}
        />
      }
    >
      <Text variant="bodySm" tone="muted" numberOfLines={3} style={styles.subtitle}>
        <Text variant="bodySm" weight="bold" tone="heading">
          {listingTitle}
        </Text>
        {t('boost.subtitleSuffix')}
      </Text>

      {hasActiveBoost && (
        <Alert variant="warning" style={styles.activeNotice} testID="boost-active-notice">
          {t('boost.activeNotice', { remainingDays })}
          {selected != null ? t('boost.activeNoticeTotal', { totalDays: remainingDays + selected }) : ''}
        </Alert>
      )}

      {loadingPricing ? (
        <View style={styles.loading} testID="boost-loading">
          <Spinner size="lg" />
        </View>
      ) : !enabled ? (
        <EmptyState
          placement="inline"
          icon="rocket-launch"
          title={t('server.product.boostUnavailable')}
          subtitle={t('emptyState.tryLaterHint')}
        />
      ) : options.length === 0 ? (
        <EmptyState
          placement="inline"
          icon="rocket-launch"
          title={t('boost.noPackages')}
          subtitle={t('emptyState.tryLaterHint')}
        />
      ) : (
        <View style={styles.optionList}>
          {options.map((opt) => {
            const active = selected === opt.durationDays;
            return (
              <ListRowCard
                key={opt.durationDays}
                onPress={() => setSelected(opt.durationDays)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={active ? styles.optionActive : undefined}
                testID={`boost-option-${opt.durationDays}`}
              >
                <RadioIndicator checked={active} color={colors.warning[500]!} />
                <Text variant="bodySm" weight="semibold" tone="heading" numberOfLines={2} style={styles.optionLabel}>
                  {opt.label}
                </Text>
                <Text variant="body" weight="bold" tone="primary">
                  {formatPrice(opt.price)}
                </Text>
              </ListRowCard>
            );
          })}
        </View>
      )}

      {isPremium && enabled && options.length > 0 && (
        <View style={styles.autoRenewRow}>
          <Text variant="bodySm" tone="body" style={styles.optionLabel}>
            {t('boost.autoRenewLabel')}
          </Text>
          <Switch value={autoRenew} onValueChange={setAutoRenew} testID="boost-auto-renew" />
        </View>
      )}
    </BottomSheet>
  );
}

interface BoostFooterProps {
  price: number | undefined;
  label: string;
  disabled: boolean;
  submitting: boolean;
  onConfirm: (runAfterClose: RunAfterClose) => void;
}

/** Sheet'in sabit alt çubuğu: seçili paketin toplam fiyatı + onay düğmesi (güvenli alan BottomSheet'te). */
function BoostFooter({ price, label, disabled, submitting, onConfirm }: BoostFooterProps) {
  const { t } = useTranslation();
  const { runAfterClose } = useBottomSheet();
  return (
    <View style={styles.footer}>
      {price != null ? (
        <View style={styles.totalRow}>
          <Text variant="body" tone="muted">
            {t('common.total')}
          </Text>
          <Text variant="h3" weight="bold" tone="heading" testID="boost-total">
            {formatPrice(price)}
          </Text>
        </View>
      ) : null}
      <Button
        variant="warning"
        fullWidth
        title={label}
        isLoading={submitting}
        disabled={disabled}
        onPress={() => onConfirm(runAfterClose)}
        testID="boost-confirm-button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginBottom: spacing[3.5] },
  activeNotice: { marginBottom: spacing[3.5] },
  loading: { paddingVertical: spacing[8], alignItems: 'center' },
  optionList: { gap: spacing[2] },
  optionActive: { borderColor: colors.warning[500]!, backgroundColor: colors.warning[50]! },
  optionLabel: { flex: 1, minWidth: 0 },
  autoRenewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  footer: { gap: spacing[3] },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
});
