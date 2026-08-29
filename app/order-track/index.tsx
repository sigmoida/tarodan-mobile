import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, Text, Input, Button, ScreenHeader, Snackbar } from '@/ui';
import { CancelOrderModal } from '@/components/orders/CancelOrderModal';

import { styles } from './_lib/styles';
import { useOrderTrack } from './_hooks/useOrderTrack';
import { OrderTrackResult } from './_components/OrderTrackResult';

const { colors } = theme;

/**
 * Guest order tracking — THIN screen. The `useOrderTrack` controller owns the
 * form state, validation, and guest track POST; this file composes the form,
 * the result card, and the help footer.
 */
export default function OrderTrackScreen() {
  const { t } = useTranslation();
  const f = useOrderTrack();

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('mobile.guestOrderTrack')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Track Form */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Ionicons name="search-outline" size={24} color={colors.primary[600]!} />
            <Text style={styles.formTitle}>{t('order.trackFormTitle')}</Text>
          </View>

          <Text style={styles.formDescription}>
            {t('order.trackFormDescription')}
          </Text>

          <Input
            label={t('checkout.orderNumberLabel')}
            value={f.orderNumber}
            onChangeText={f.onChangeOrderNumber}
            containerStyle={styles.input}
            placeholder="ORD- / GRP- / PKG-"
            autoCapitalize="characters"
          />

          <Input
            label={t('auth.emailAddress')}
            value={f.email}
            onChangeText={f.onChangeEmail}
            containerStyle={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder={t('auth.emailPlaceholder')}
          />

          {f.error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger[600]!} />
              <Text style={styles.errorText}>{f.error}</Text>
            </View>
          ) : null}

          <Button
            variant="primary"
            title={t('order.trackSubmitCta')}
            onPress={f.handleTrack}
            isLoading={f.loading}
            disabled={f.loading}
            style={styles.trackButton}
            icon="search"
          />
        </View>

        {/* Order Result */}
        {f.order && <OrderTrackResult order={f.order} />}

        {/*
          Misafir iptali (delta 19). Web'in `GuestCancelModal`'ıyla aynı uç ve
          aynı neden listesi; kapı `canGuestCancel` — kargoya verilmiş siparişte
          hiç çizilmez.
        */}
        {f.cancel.available ? (
          <Button
            testID="guest-cancel-button"
            variant="outline"
            icon="close-circle-outline"
            fullWidth
            title={t('order.guestCancelCta')}
            onPress={f.cancel.open}
            disabled={f.cancel.isPending}
            style={styles.guestCancelButton}
          />
        ) : null}

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Ionicons name="help-circle-outline" size={24} color={colors.primary[600]!} />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>{t('order.trackHelpTitle')}</Text>
            <Text style={styles.helpText}>
              {t('order.trackHelpText')}
            </Text>
            <TouchableOpacity style={styles.helpButton} onPress={() => router.push('/help')}>
              <Text style={styles.helpButtonText}>{t('order.trackHelpCta')}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary[600]!} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <CancelOrderModal
        isOpen={f.cancel.visible}
        onClose={f.cancel.close}
        onConfirm={f.cancel.confirm}
        willRefund={f.cancel.willRefund}
        pending={f.cancel.isPending}
      />

      <Snackbar
        visible={f.snackbar.visible}
        onDismiss={f.dismissSnackbar}
        duration={3500}
        variant={f.snackbar.variant}
      >
        {f.snackbar.message}
      </Snackbar>
    </View>
  );
}
