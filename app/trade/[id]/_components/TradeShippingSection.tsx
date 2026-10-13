import React from 'react';
import { View, Pressable, Linking, StyleSheet } from 'react-native';
import { SectionCard, Text, Button, theme, Icon } from '@/ui';
import { buildTrackingUrl, deriveShipmentView } from '@/lib/shipping/tracking';
import { ShipmentStatusChip } from './ShipmentStatusChip';
import { renderOtherShipmentHint } from '../_lib/status';
import type { Trade, TFn, TradeShipment } from '../_lib/types';
import type { TradeView } from '../_lib/derive';

const { colors } = theme;

/** Link ELLE BİRLEŞTİRİLMEZ — tek kaynak `buildTrackingUrl` (§ kargo takibi). */
const openSuratTrack = (code: string) => {
  const url = buildTrackingUrl('surat', code);
  if (url) Linking.openURL(url);
};

// 'Sürat Kargo' bir taşıyıcı markası — özel ad, çevrilmez (CLAUDE.md kural 4).
const carrierLabel = (s: TradeShipment) =>
  (s.carrier === 'surat' ? 'Sürat Kargo' : s.carrier || '—') +
  (s.trackingNumber ? ` · ${s.trackingNumber}` : '');

/**
 * Gönderi → takip görünümü. `TradeShipment.carrier` field'ını
 * `deriveShipmentView`'ün beklediği `provider`'a eşler ve `cargoCode`'u
 * fallback olarak verir — üç kart (depoya-giriş/alıcıya-çıkış/iade) bu
 * eşlemeyi paylaşır (CLAUDE.md §5: tekrar eden blok çıkarılır).
 */
function shipmentTrackingView(s: TradeShipment | null | undefined) {
  if (!s) return deriveShipmentView(null);
  return deriveShipmentView({ ...s, provider: s.provider ?? s.carrier }, s.cargoCode);
}

function CopyBtn({ code, onCopy, t }: { code?: string | null; onCopy: (c?: string | null) => void; t: TFn }) {
  if (!code) return null;
  return (
    <Pressable onPress={() => onCopy(code)} style={styles.copyBtn} hitSlop={8}>
      <Text variant="caption" tone="primary" weight="medium">{t('common.copy')}</Text>
    </Pressable>
  );
}

/** Kargo kartları: legacy takip + depoya-giriş + alıcılara-çıkış + iade. */
export function TradeShippingSection({
  trade,
  view,
  t,
  onCopy,
}: {
  trade: Trade;
  view: TradeView;
  t: TFn;
  onCopy: (code?: string | null) => void;
}) {
  const {
    isInitiator,
    isReceiver,
    myToWarehouseShipment,
    otherToWarehouseShipment,
    myFromWarehouseShipment,
    otherFromWarehouseShipment,
    myReturnShipment,
    myTrackingNumber,
    theirTrackingNumber,
  } = view;

  // Gerçek taşıyıcı kodu HEP `deriveShipmentView` üzerinden — iç referans
  // (`TKS-…`) hiçbir zaman `openSuratTrack`'e verilmez (§ kargo takibi).
  // Legacy alan yalnız iç referansı taşır; gerçek kod API'de hiç bulunmuyor
  // (v2 yanıtında initiatorTrackingNumber/receiverTrackingNumber alanı VAR
  // ama değeri ölçülen örneklerde HEP `null` — dolu bir değer gözlenmedi),
  // o yüzden bu görünüm HER ZAMAN isCodePending=true döner. Diğer üç karttan
  // FARKLI olarak burada "kod hazırlanıyor" metni de basılmaz — bu dal asla
  // ilerlemeyecek bir "yakında gelecek" sözü vermiş olurdu (bkz. JSX'teki not).
  const legacyView = deriveShipmentView(
    theirTrackingNumber ? { provider: 'surat', trackingNumber: theirTrackingNumber } : null,
  );
  const toWarehouseView = shipmentTrackingView(myToWarehouseShipment);
  const fromWarehouseView = shipmentTrackingView(myFromWarehouseShipment);
  const returnView = shipmentTrackingView(myReturnShipment);

  return (
    <>
      {/* Legacy Kargo Durumu — yalnızca eski (direkt-kargo) takaslarda. */}
      {(myTrackingNumber || theirTrackingNumber) && (
        <SectionCard title={t('trade.shippingStatus.title')} bodyStyle={styles.stack}>
          <View style={styles.shippingRow}>
            <Icon
              name={myTrackingNumber ? 'check-circle' : 'minus-circle'} variant={myTrackingNumber ? 'solid' : 'outline'}
              size={20}
              color={myTrackingNumber ? colors.success[600]! : colors.text.muted}
            />
            <Text variant="body" style={styles.shippingText}>
              {t('trade.yourShipmentLabel', { value: myTrackingNumber || t('trade.notShippedYet') })}
            </Text>
          </View>
          <View style={styles.shippingRow}>
            <Icon
              name={theirTrackingNumber ? 'check-circle' : 'minus-circle'} variant={theirTrackingNumber ? 'solid' : 'outline'}
              size={20}
              color={theirTrackingNumber ? colors.success[600]! : colors.text.muted}
            />
            <Text variant="body" style={styles.shippingText}>
              {t('trade.otherPartyShipmentLabel', { value: theirTrackingNumber || t('trade.notShippedYet') })}
            </Text>
          </View>
          {legacyView.trackingUrl ? (
            <Button
              variant="outline"
              title={t('trade.trackShipmentLegacy')}
              onPress={() => openSuratTrack(legacyView.cargoCode!)}
              style={styles.trackButton}
            />
          ) : null /* legacy alanda gerçek kod HİÇ gelmez (bkz. yukarıdaki not) —
                       diğer üç karttan farklı olarak burada "kod hazırlanıyor"
                       yazmıyoruz, çünkü asla hazır olmayacak bir şeyi "hazırlanıyor"
                       demek yanıltıcı olurdu. Bu ayrımı "tutarlılık" adına kaldırmayın. */}
        </SectionCard>
      )}

      {/* Inbound shipment info (Sürat Kargo, auto-issued). */}
      {['shipping_to_warehouse', 'at_warehouse', 'admin_reviewing'].includes(trade.status) &&
        myToWarehouseShipment?.trackingNumber &&
        (isInitiator || isReceiver) && (
          <SectionCard title={t('trade.warehouseShipping.title')} testID="trade-inbound-card" bodyStyle={styles.stack}>
            <Text variant="caption" style={styles.protectionDesc}>{t('trade.warehouseShipping.subtitle')}</Text>
            <View style={styles.inboundShipBox}>
              <Text variant="caption" style={styles.messageSender}>{t('trade.warehouseShipping.yourShipment')}</Text>
              <View style={styles.trackingCodeRow}>
                <Text style={[styles.inboundTrackingNumber, { flex: 1 }]} numberOfLines={1}>
                  {myToWarehouseShipment?.trackingNumber ?? '—'}
                </Text>
                <CopyBtn code={myToWarehouseShipment?.trackingNumber} onCopy={onCopy} t={t} />
              </View>
              {trade.status === 'shipping_to_warehouse' ? (
                <Text variant="caption" style={styles.inboundShipHint}>{t('trade.warehouseShipping.handIn')}</Text>
              ) : (
                <Text variant="caption" style={styles.inboundShipHint}>{t('trade.warehouseShipping.arrived')}</Text>
              )}
              <View style={styles.inboundChipRow}>
                <ShipmentStatusChip testID="trade-status-chip-my-inbound" status={myToWarehouseShipment?.status} t={t} />
              </View>
              {toWarehouseView.trackingUrl ? (
                <Button
                  variant="outline"
                  title={t('order.trackOnSurat')}
                  onPress={() => openSuratTrack(toWarehouseView.cargoCode!)}
                  style={styles.trackButton}
                />
              ) : toWarehouseView.isCodePending ? (
                <Text variant="caption" style={styles.inboundShipHint}>{t('shipping.codePending')}</Text>
              ) : null}
            </View>
            <Text variant="caption" style={styles.inboundShipHint}>
              {renderOtherShipmentHint(otherToWarehouseShipment?.status, t)}
            </Text>
          </SectionCard>
        )}

      {/* Shipping to recipients — outbound from warehouse. */}
      {trade.status === 'shipping_to_recipients' && (isInitiator || isReceiver) && (
        <SectionCard title={t('trade.shipmentOnWay')} testID="trade-outbound-card" bodyStyle={styles.stack}>
          {myFromWarehouseShipment ? (
            <View style={styles.inboundShipBox}>
              <Text variant="caption" style={styles.messageSender}>{t('trade.shippedToYou')}</Text>
              <View style={styles.trackingCodeRow}>
                <Text style={[styles.inboundTrackingNumber, { flex: 1 }]} numberOfLines={1}>
                  {carrierLabel(myFromWarehouseShipment)}
                </Text>
                <CopyBtn code={myFromWarehouseShipment.trackingNumber} onCopy={onCopy} t={t} />
              </View>
              <View style={styles.inboundChipRow}>
                <ShipmentStatusChip testID="trade-status-chip-my-outbound" status={myFromWarehouseShipment.status} t={t} />
              </View>
              {fromWarehouseView.trackingUrl ? (
                <Button
                  variant="outline"
                  title={t('order.trackOnSurat')}
                  onPress={() => openSuratTrack(fromWarehouseView.cargoCode!)}
                  style={styles.trackButton}
                />
              ) : fromWarehouseView.isCodePending ? (
                <Text variant="caption" style={styles.inboundShipHint}>{t('shipping.codePending')}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.inboundShipBox}>
              <Text variant="caption" style={styles.inboundShipHint}>{t('trade.trackingSoon')}</Text>
            </View>
          )}
          {otherFromWarehouseShipment ? (
            <View style={[styles.inboundShipBox, { marginTop: theme.spacing[2] }]}>
              <Text variant="caption" style={styles.messageSender}>{t('trade.otherPartyShipment')}</Text>
              <Text variant="bodySm" numberOfLines={1}>{carrierLabel(otherFromWarehouseShipment)}</Text>
              <View style={styles.inboundChipRow}>
                <ShipmentStatusChip status={otherFromWarehouseShipment.status} t={t} />
              </View>
            </View>
          ) : null}
        </SectionCard>
      )}

      {/* Return shipment tracking. */}
      {trade.status === 'returning' && myReturnShipment && (
        <SectionCard title={t('trade.returnShipment')} testID="trade-return-card" bodyStyle={styles.stack}>
          <View style={styles.inboundShipBox}>
            <View style={styles.trackingCodeRow}>
              <Text style={[styles.inboundTrackingNumber, { flex: 1 }]} numberOfLines={1}>
                {carrierLabel(myReturnShipment)}
              </Text>
              <CopyBtn code={myReturnShipment.trackingNumber} onCopy={onCopy} t={t} />
            </View>
            <View style={styles.inboundChipRow}>
              <ShipmentStatusChip status={myReturnShipment.status} t={t} />
            </View>
            {returnView.trackingUrl ? (
              <Button
                variant="outline"
                title={t('order.trackOnSurat')}
                onPress={() => openSuratTrack(returnView.cargoCode!)}
                style={styles.trackButton}
              />
            ) : returnView.isCodePending ? (
              <Text variant="caption" style={styles.inboundShipHint}>{t('shipping.codePending')}</Text>
            ) : null}
          </View>
        </SectionCard>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing[2] },
  shippingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] },
  shippingText: { flex: 1 },
  trackButton: { marginTop: theme.spacing[2] },
  protectionDesc: { color: colors.text.muted },
  messageSender: { color: colors.primary[600]!, fontWeight: theme.typography.fontWeight.medium },
  inboundShipBox: {
    padding: theme.spacing[3],
    borderRadius: theme.radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.alt,
    gap: theme.spacing[1],
  },
  inboundTrackingNumber: {
    fontFamily: 'Courier',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.heading,
  },
  inboundChipRow: { flexDirection: 'row', marginTop: theme.spacing[1] },
  trackingCodeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.radiusRole.button,
    backgroundColor: colors.primary[50]!,
  },
  inboundShipHint: { color: colors.text.muted },
});
