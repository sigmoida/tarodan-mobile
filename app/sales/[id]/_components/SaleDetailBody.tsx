import { useTranslation } from 'react-i18next';
import { View, Image, Pressable } from 'react-native';
import { Button, Divider, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  formatPrice,
  formatServerPrice,
  serverAmount,
  formatOrderStatus,
  formatRelativeDate,
} from '@/utils/format';
import { transformImageUrl } from '@/utils/imageUrl';
import { shipmentStatusLabel } from '@/lib/shipping/shipmentStatus';
import { styles } from '../_lib/styles';
import type { SaleDetailController } from '../_hooks/useSaleDetail';

const { colors } = theme;

/** Sipariş detay gövdesi — durum, ürünler, alıcı, adres, kargo, tutar kartları. */
export function SaleDetailBody({ f }: { f: SaleDetailController }) {
  const { t } = useTranslation();
  const order = f.order;
  if (!order) return null;

  const s = f.shipmentView;
  const hasShipment = !!(s.cargoCode || s.reference);
  const p = order.pricing;
  const subtotal = p?.subtotal ?? order.subtotal;
  const shipping = p?.shippingAmount ?? order.shippingCost;
  const commission = p?.commissionAmount ?? order.commission;
  // Stopaj yalnızca kurumsal satıcıda > 0 gelir (GVK 94/19, beyannamede mahsup edilir)
  const withholding = p?.withholdingTaxAmount ?? 0;
  const net = p?.sellerNetAmount ?? order.netAmount;

  return (
    <>
      {/* Status */}
      <View style={[styles.statusBanner, { backgroundColor: f.sc.bg }]}>
        <Ionicons name="information-circle" size={20} color={f.sc.fg} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusText, { color: f.sc.fg }]}>{formatOrderStatus(f.displayStatus)}</Text>
          <Text style={[styles.statusSub, { color: f.sc.fg }]}>{formatRelativeDate(order.createdAt)}</Text>
        </View>
      </View>

      {/* Items */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ürünler</Text>
        {(order.items || []).map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.itemRow, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push(`/product/${item.product?.id}`)}
          >
            <Image source={{ uri: transformImageUrl(item.product?.imageUrl) }} style={styles.itemImg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle} numberOfLines={2}>{item.product?.title}</Text>
              <Text style={styles.itemMeta}>Adet: {item.quantity}</Text>
              {/* Satır tutarı SUNUCUDAN. `price` siparişe girildiği andaki donmuş
                  kopya; adetle çarpınca tahsil edilenden sapabiliyor. Sunucu satır
                  tutarı göndermediyse çarpım uydurulmaz — birim fiyat basılır. */}
              {serverAmount(item.subtotal) != null ? (
                <Text style={styles.itemPrice}>{formatServerPrice(item.subtotal)}</Text>
              ) : (
                <Text style={styles.itemPrice}>
                  Birim {formatServerPrice(item.price)}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>

      {/* Buyer */}
      {order.buyer ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Alıcı</Text>
          <View style={styles.kvRow}>
            <Ionicons name="person-outline" size={16} color={colors.text.muted} />
            <Text style={styles.kvValue}>{order.buyer.displayName}</Text>
          </View>
          {order.buyer.phone ? (
            <Pressable style={styles.kvRow} onPress={f.handleCall}>
              <Ionicons name="call-outline" size={16} color={colors.text.muted} />
              <Text style={[styles.kvValue, { color: colors.primary[600]! }]}>{order.buyer.phone}</Text>
            </Pressable>
          ) : null}
          {order.buyer.email ? (
            <View style={styles.kvRow}>
              <Ionicons name="mail-outline" size={16} color={colors.text.muted} />
              <Text style={styles.kvValue}>{order.buyer.email}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Shipping Address */}
      {order.shippingAddress ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Teslimat Adresi</Text>
          <Text style={styles.addressName}>{order.shippingAddress.fullName}</Text>
          <Text style={styles.addressLine}>{order.shippingAddress.address}</Text>
          <Text style={styles.addressLine}>
            {order.shippingAddress.district}, {order.shippingAddress.city}
            {order.shippingAddress.zipCode ? ` ${order.shippingAddress.zipCode}` : ''}
          </Text>
          <Text style={styles.addressLine}>Tel: {order.shippingAddress.phone}</Text>
        </View>
      ) : null}

      {/* Shipment — İKİ NUMARA, İKİ İŞ. Kod gelmeden satıcı ŞUBE REFERANSINI
          görür (Sürat onu tanımaz, link verilmez); kod gelince gerçek Sürat
          takip numarası + koddan KURULMUŞ link. Kalıp: `OrderTrackingCard`. */}
      <View style={styles.card} testID="sales-shipment-card">
        <Text style={styles.sectionTitle}>Kargo Bilgisi (Sürat Kargo)</Text>
        {hasShipment ? (
          <>
            <View style={styles.kvRow}>
              <MaterialCommunityIcons name="truck-fast-outline" size={18} color={colors.primary[600]!} />
              <Text style={styles.kvValue}>
                {f.isSurat ? 'Sürat Kargo' : f.shipmentProvider || 'Sürat Kargo'}
              </Text>
            </View>

            {order.shipment?.status ? (
              <View style={styles.kvRow}>
                <Ionicons name="pulse-outline" size={18} color={colors.text.muted} />
                <Text testID="sales-shipment-status" style={styles.kvValue}>
                  {shipmentStatusLabel(order.shipment.status, t)}
                </Text>
              </View>
            ) : null}

            {s.cargoCode ? (
              <>
                <Text style={styles.kvLabel}>{t('order.trackingNumber')}</Text>
                <View style={styles.kvRow}>
                  <Ionicons name="barcode-outline" size={18} color={colors.text.muted} />
                  <Text testID="sales-tracking-number" selectable style={[styles.kvValue, { fontWeight: '700' }]}>
                    {s.cargoCode}
                  </Text>
                </View>
                {s.trackingUrl ? (
                  <Button
                    testID="sales-track-link"
                    variant="outline"
                    icon="cube"
                    title={t('order.trackOnSurat')}
                    onPress={f.handleTrack}
                    style={{ marginTop: theme.spacing[2] }}
                  />
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.kvLabel}>{t('order.cargoReference')}</Text>
                <View style={styles.kvRow}>
                  <Ionicons name="barcode-outline" size={18} color={colors.text.muted} />
                  <Text testID="sales-cargo-reference" selectable style={[styles.kvValue, { fontWeight: '700' }]}>
                    {s.reference}
                  </Text>
                </View>
                <Text style={styles.helperText}>{t('order.cargoRefInstructions')}</Text>
                <Text style={styles.helperText}>{t('order.trackingAppearsAfterDropoff')}</Text>
              </>
            )}
          </>
        ) : (
          <Text style={styles.helperText}>
            Ödeme onaylandıktan sonra Sürat Kargo gönderiniz otomatik oluşturulur. Takip numarası kısa süre içinde burada görünecek.
          </Text>
        )}
      </View>

      {/* Totals */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tutar Özeti</Text>
        {subtotal != null ? (
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Ara Toplam</Text>
            <Text style={styles.kvValue}>{formatPrice(subtotal)}</Text>
          </View>
        ) : null}
        {shipping != null ? (
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Kargo</Text>
            <Text style={styles.kvValue}>{formatPrice(shipping)}</Text>
          </View>
        ) : null}
        {commission != null ? (
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Komisyon</Text>
            <Text style={[styles.kvValue, { color: colors.danger[600]! }]}>- {formatPrice(commission)}</Text>
          </View>
        ) : null}
        {withholding > 0 ? (
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Stopaj (tevkifat)</Text>
            <Text style={[styles.kvValue, { color: colors.danger[600]! }]}>- {formatPrice(withholding)}</Text>
          </View>
        ) : null}
        <Divider style={{ marginVertical: theme.spacing[2] }} />
        <View style={styles.kvRow}>
          <Text style={[styles.kvLabel, { fontWeight: '700' }]}>{net != null ? 'Net Kazanç' : 'Toplam'}</Text>
          <Text style={[styles.kvValue, { fontSize: 18, fontWeight: '800', color: colors.primary[600]! }]}>
            {formatPrice(net ?? order.totalAmount ?? 0)}
          </Text>
        </View>
      </View>
    </>
  );
}
