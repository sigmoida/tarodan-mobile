import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Text, theme } from '@/ui';
import {
  deleteAccountPaths,
  type DeleteAccountFailure,
  type DeleteAccountPathKey,
} from '../_lib/deleteAccountError';

const PATH_LABEL: Record<DeleteAccountPathKey, 'mobile.quickMySales' | 'trade.myTrades' | 'nav.myOrders'> = {
  sales: 'mobile.quickMySales',
  trades: 'trade.myTrades',
  orders: 'nav.myOrders',
};

/**
 * Silme engelleri: sunucu başlığı + her engel (web: başlık + engel başına toast) ve
 * izlenebilecek ekranlara yol (yalnız navigasyon). Engel kalkınca kullanıcı yeniden dener.
 */
export function DeleteAccountBlockers({ failure }: { failure: DeleteAccountFailure }) {
  const { t } = useTranslation();
  const paths = deleteAccountPaths(failure);
  return (
    <View style={styles.wrap} testID="delete-account-blockers">
      <Alert variant="danger" title={t('profile.cannotDeleteAccount')}>
        <View style={styles.list}>
          <Text variant="bodySm" tone="danger">
            {failure.title}
          </Text>
          {failure.reasons.map((reason, i) => (
            <Text key={i} variant="bodySm" tone="danger" testID={`delete-account-blocker-${i}`}>
              {`• ${reason}`}
            </Text>
          ))}
        </View>
      </Alert>
      {paths.map((p) => (
        <Button
          key={p.key}
          variant="outline"
          fullWidth
          title={t(PATH_LABEL[p.key])}
          onPress={() => router.push(p.href)}
          testID={`delete-account-path-${p.key}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing[2] },
  list: { gap: theme.spacing[1] },
});
