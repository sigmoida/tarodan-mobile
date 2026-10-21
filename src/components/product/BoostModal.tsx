/**
 * BoostModal - boost a listing: pick package/duration/price -> start payment -> /payment/[id].
 * Same flow as the web BoostModal. Backend: GET /products/:id/boost/options (package
 * model, same source as web), POST /products/:id/boost/initiate.
 *
 * Bottom sheet: package/duration radios in the body, total price + [Boost and pay] in
 * the fixed footer. The redirect to the payment screen runs after the sheet is fully
 * closed (`runAfterClose`, src/ui/CLAUDE.md > iOS modal rule).
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
  ErrorState,
  ListRowCard,
  RadioIndicator,
  Spinner,
  Switch,
  Text,
  theme,
  useBottomSheet,
} from '@/ui';
import { productsApi, type BoostOptionsResponse } from '@/lib/api';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { formatPrice } from '@/utils/format';

const { colors, spacing } = theme;

interface BoostOption {
  /** Unique per (package, duration): several packages can offer the same duration. */
  key: string;
  packageId: string;
  packageName: string;
  durationDays: number;
  price: number;
}

/** Flattens `packages[].options[]` into one selectable row per (package, duration), in API order. */
function toBoostOptions(data: BoostOptionsResponse | undefined): BoostOption[] {
  return (data?.packages ?? []).flatMap((pkg) =>
    (pkg.options ?? []).map((o) => ({
      key: `${pkg.id}:${o.durationDays}`,
      packageId: pkg.id,
      packageName: pkg.name,
      durationDays: o.durationDays,
      price: o.price,
    })),
  );
}

/** Built at render time so a language switch never shows labels cached in the old language. */
function optionLabel(opt: BoostOption, t: TFunction): string {
  const days = t('membership.daysCount', { count: opt.durationDays });
  return opt.packageName ? `${opt.packageName} · ${days}` : days;
}

/** Same default as web: the first package's 7-day option, else that package's first option. */
function defaultOptionKey(options: BoostOption[]): string | undefined {
  const first = options[0];
  if (!first) return undefined;
  const firstPackage = options.filter((o) => o.packageId === first.packageId);
  return (firstPackage.find((o) => o.durationDays === 7) ?? first).key;
}

interface BoostModalProps {
  visible: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  /** Current boost end date of the listing (if any): drives the remaining-days and extend notice. */
  boostedUntil?: string | null;
  /** Premium user: auto-renew is premium only. */
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
  const [selected, setSelected] = useState<string | null>(null);
  const [autoRenew, setAutoRenew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    data,
    isLoading: loadingPricing,
    isError,
    refetch,
  } = useQuery({
    queryKey: qk.products.boostOptions(listingId),
    enabled: visible && !!listingId,
    queryFn: async () => (await productsApi.getBoostOptions(listingId)).data,
  });

  // A failed request shows a load error with retry (like web's toast), never a price list.
  const options = useMemo(() => (isError ? [] : toBoostOptions(data)), [data, isError]);
  const enabled = data ? data.enabled !== false : true;

  // Once the options arrive, pick the default without overriding the user's choice.
  useEffect(() => {
    if (!options.length) return;
    setSelected((current) =>
      current != null && options.some((o) => o.key === current) ? current : (defaultOptionKey(options) ?? null),
    );
  }, [options]);

  const remainingDays = boostedUntil
    ? Math.max(0, Math.ceil((new Date(boostedUntil).getTime() - Date.now()) / 86400000))
    : 0;
  const hasActiveBoost = remainingDays > 0;
  const chosen = options.find((o) => o.key === selected);

  const handleConfirm = async (runAfterClose: RunAfterClose) => {
    if (!chosen || submitting) return;
    setSubmitting(true);
    try {
      const res = await productsApi.initiateBoost(listingId, {
        durationDays: chosen.durationDays,
        packageId: chosen.packageId,
        autoRenew: isPremium ? autoRenew : false,
        provider: 'paytr',
      });
      const data: any = res?.data?.data ?? res?.data ?? {};
      const paymentId = data.paymentId || data.id || data.payment?.id;
      // initiateBoost already creates the PayTR token + URL. We pass the URL to the
      // payment screen so it does not initiate/retry again (retry rejects a pending
      // payment: "only failed payments can be retried"). Same pattern as checkout:
      // the single-use token is not wasted.
      const paymentUrl: string | undefined = data.paymentUrl;
      if (paymentId) {
        setSubmitting(false);
        // The sheet closes first; the redirect runs after it is gone (src/ui/CLAUDE.md > iOS modal rule).
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

  const confirmDisabled = submitting || loadingPricing || !enabled || !chosen;

  // Safety lock: no in-app digital sales (iOS Guideline 3.1.1, Play payments policy).
  // The early return comes after all hooks, right before the JSX, to keep hook order.
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
          {chosen ? t('boost.activeNoticeTotal', { totalDays: remainingDays + chosen.durationDays }) : ''}
        </Alert>
      )}

      {loadingPricing ? (
        <View style={styles.loading} testID="boost-loading">
          <Spinner size="lg" />
        </View>
      ) : isError ? (
        <ErrorState
          placement="inline"
          title={t('profile.boost.pricingLoadError')}
          onRetry={() => refetch()}
          testID="boost-load-error"
        />
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
            const active = selected === opt.key;
            return (
              <ListRowCard
                key={opt.key}
                onPress={() => setSelected(opt.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={active ? styles.optionActive : undefined}
                testID={`boost-option-${opt.packageId}-${opt.durationDays}`}
              >
                <RadioIndicator checked={active} color={colors.warning[500]!} />
                <Text variant="bodySm" weight="semibold" tone="heading" numberOfLines={2} style={styles.optionLabel}>
                  {optionLabel(opt, t)}
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

/** The sheet's fixed footer: the selected option's total price + confirm button (safe area is in BottomSheet). */
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
