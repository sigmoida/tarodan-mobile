import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Alert, SectionCard, Text, Button, StatusBadge, theme, Icon, ButtonRow } from '@/ui';
import { useTradeStatusConfig, type TradeViewerRole } from '@/lib/shared/tradeStatus';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  useTradeStatusDetail,
  buildStatusDescriptions,
  STEP_FLOW_STATUSES,
  deadlineForStatus,
  formatCountdown,
} from '../_lib/status';
import { TradeProgressStepper } from './TradeProgressStepper';
import type { Trade, TFn } from '../_lib/types';

const { colors } = theme;

/** Üst statü blokları: banner + açıklama + geri sayım + stepper + tamamlandı/depo/iade kartları. */
export function TradeStatusHeader({
  trade,
  t,
  now,
  hasPaymentStep,
  viewerRole,
}: {
  trade: Trade;
  t: TFn;
  now: number;
  /**
   * `view.hasPaymentStep` (tek kaynak `_lib/derive.ts`). v2'de eşit takasta bile
   * ödeme aşaması vardır; buradaki eski `cashAmount > 0` türetmesi
   * `awaiting_payment`'ı adım listesinden düşürüp çubuğu yanlış adımda
   * gösteriyordu.
   */
  hasPaymentStep: boolean;
  /** Bakan tarafın rolü — gönderi/teslim etiketleri "siz / karşı taraf" diye seçilir. */
  viewerRole?: TradeViewerRole;
}) {
  // Etiket/renk/ikon TEK kaynaktan, çevrilmiş hâlde.
  const statusDetail = useTradeStatusDetail(viewerRole);
  const statusInfoBase = statusDetail[trade.status] ?? statusDetail.pending!;
  // `NEW_STATUS_KEYS` override'ı KALDIRILDI: paylaşılan harita zaten her durum
  // için katalog anahtarı taşıyor, override ikinci bir anahtar seti
  // (`trade.tradeStatus.*` vs `trade.status*`) ve dolayısıyla ikinci bir kelime
  // seti yaratıyordu ("Depoya Gönderim" / "Depoya Gönderiliyor").
  const statusInfo = statusInfoBase;
  // Rozet de aynı tek kaynaktan — banner ile rozet farklı kelime göstermesin.
  const badgeConfig = useTradeStatusConfig(viewerRole);
  const hasBadge = !!badgeConfig[trade.status];
  const countdown = formatCountdown(deadlineForStatus(trade), now);
  const statusDescriptions = buildStatusDescriptions(t);
  const statusDescription = statusDescriptions[trade.status];

  return (
    <>
      {/* Status Banner — durum ikonu işlevsel (durumu anlatır), kalır */}
      <View style={[styles.statusBanner, { backgroundColor: statusInfo.color + '15' }]}>
        <Icon name={statusInfo.icon} size={theme.iconSize.lg} color={statusInfo.color} />
        <Text variant="body" weight="semibold" style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.label}
        </Text>
        {hasBadge ? <StatusBadge status={trade.status} config={badgeConfig} size="sm" /> : null}
      </View>

      {/* Status description — özel kartı olan statülerde tekrar olmasın diye gizlenir. */}
      {statusDescription &&
        !['completed', 'at_warehouse', 'admin_reviewing', 'returning'].includes(trade.status) && (
          <Alert variant="default">
            <Text variant="bodySm" tone="body">{statusDescription}</Text>
            {trade.cancelReason && (trade.status === 'cancelled' || trade.status === 'rejected') ? (
              <Text variant="caption" tone="muted">
                {t('common.reason')}: {trade.cancelReason}
              </Text>
            ) : null}
          </Alert>
        )}

      {/* Countdown */}
      {countdown && (
        <View style={styles.countdownCard}>
          <Text variant="h3" weight="bold" style={styles.countdownText}>{countdown}</Text>
          <Text variant="caption" tone="muted">{t('trade.countdownHint')}</Text>
        </View>
      )}

      {/* Progress Stepper (depo-escrow akışı) */}
      {STEP_FLOW_STATUSES.has(trade.status) && (
        <SectionCard>
          <TradeProgressStepper status={trade.status} hasCash={hasPaymentStep} />
        </SectionCard>
      )}

      {/* Completed summary */}
      {trade.status === 'completed' && (
        <SectionCard title={t('trade.completedSummaryTitle')} style={styles.completedCard} bodyStyle={styles.stack}>
          <Text variant="bodySm" tone="muted">{t('trade.completedSummaryDesc')}</Text>
          <View style={styles.summaryDateRow}>
            <Text variant="bodySm" tone="muted">{t('trade.createdAt')}</Text>
            <Text variant="bodySm">{format(new Date(trade.createdAt), 'd MMM yyyy', { locale: tr })}</Text>
          </View>
          {trade.acceptedAt ? (
            <View style={styles.summaryDateRow}>
              <Text variant="bodySm" tone="muted">{t('trade.statusAccepted')}</Text>
              <Text variant="bodySm">{format(new Date(trade.acceptedAt), 'd MMM yyyy', { locale: tr })}</Text>
            </View>
          ) : null}
          {trade.completedAt ? (
            <View style={styles.summaryDateRow}>
              <Text variant="bodySm" tone="muted">{t('trade.statusCompleted')}</Text>
              <Text variant="bodySm">{format(new Date(trade.completedAt), 'd MMM yyyy', { locale: tr })}</Text>
            </View>
          ) : null}
          <ButtonRow style={{ marginTop: theme.spacing[2] }}>
            <Button variant="outline" title={t('trade.myTrades')} onPress={() => router.replace('/trades' as any)} style={{ flex: 1 }} />
            <Button variant="primary" title={t('mobile.guestBrowseListings')} onPress={() => router.push('/search')} style={{ flex: 1 }} />
          </ButtonRow>
        </SectionCard>
      )}

      {/* Warehouse review banner */}
      {(trade.status === 'at_warehouse' || trade.status === 'admin_reviewing') && (
        <Alert variant="info" title={t('trade.warehouseBannerTitle')}>
          {t('trade.warehouseBannerDesc')}
        </Alert>
      )}

      {/* Returning banner */}
      {trade.status === 'returning' && (
        <Alert variant="warning" title={t('trade.returningBannerTitle')}>
          <Text variant="bodySm" tone="muted">{t('trade.returningBannerDesc')}</Text>
          {trade.cancelReason ? (
            <Text variant="caption" tone="muted">{t('common.reason')}: {trade.cancelReason}</Text>
          ) : null}
        </Alert>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    borderRadius: theme.radiusRole.card,
    gap: theme.spacing[2],
  },
  statusText: { flex: 1 },
  countdownCard: {
    padding: theme.spacing[3],
    borderRadius: theme.radiusRole.card,
    backgroundColor: colors.primary[50]!,
    borderWidth: 1,
    borderColor: colors.primary[100]!,
    gap: theme.spacing[0.5],
  },
  countdownText: { color: colors.primary[800]!, fontFamily: 'Courier' },
  stack: { gap: theme.spacing[2] },
  completedCard: { backgroundColor: colors.success[50]!, borderColor: colors.success[200]! },
  summaryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.success[200]!,
  },
});
