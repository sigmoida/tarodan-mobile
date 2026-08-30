import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { ScreenHeader, theme } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { usePaymentHistory } from './_hooks/usePaymentHistory';
import { styles } from './_lib/styles';
import { PaymentHistoryItem } from './_components/PaymentHistoryItem';

export default function PaymentHistoryScreen() {
  const { t } = useTranslation();
  const f = usePaymentHistory();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!f.isAuthenticated) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('mobile.settingsPaymentHistory')} onBack={back} />
        <View style={styles.centeredContainer}>
          <Ionicons name="log-in-outline" size={48} color={theme.colors.gray[400]} />
          <Text style={styles.emptyTitle}>{t('membership.loginRequiredTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('payment.myPaymentsLoginSubtitle')}</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginButtonText}>{t('common.login')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('mobile.settingsPaymentHistory')} onBack={back} />

      {f.isLoading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={f.payments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PaymentHistoryItem item={item} onPress={f.handlePaymentPress} />}
          contentContainerStyle={f.payments.length === 0 ? styles.emptyListContainer : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={f.isRefreshing}
              onRefresh={() => f.fetchPayments()}
              colors={[theme.colors.primary[500]]}
              tintColor={theme.colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={48} color={theme.colors.gray[400]} />
              </View>
              <Text style={styles.emptyTitle}>{t('payment.noHistory')}</Text>
              <Text style={styles.emptySubtitle}>{t('payment.noPaymentsSubtitle')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
