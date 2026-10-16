import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text, theme } from '@/ui';

const { spacing } = theme;

export interface ListFooterRetryProps {
  /** Sonraki sayfayı yeniden iste (genelde `fetchNextPage`). */
  onRetry: () => void;
  /** Satır metni; verilmezse genel hata metni (`common.genericError`). */
  message?: string;
  testID?: string;
}

/**
 * Sonsuz listede SONRAKİ SAYFA yüklenemediğinde liste altında çıkan kompakt "Tekrar dene" satırı
 * (tam ekran `ErrorState` değil — yüklü liste korunur). Kullanım: `isFetchNextPageError` iken
 * `ListFooterComponent`; aynı anda `onEndReached` bu durumda sayfa istemez (kullanıcı düğmeye basar,
 * aksi halde kaydırdıkça sürekli yeniden denerdi).
 */
export const ListFooterRetry: React.FC<ListFooterRetryProps> = ({
  onRetry,
  message,
  testID = 'list-footer-retry',
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.row} testID={testID}>
      <Text variant="bodySm" tone="muted" align="center">
        {message ?? t('common.genericError')}
      </Text>
      <Button variant="outline" size="sm" title={t('common.tryAgain')} onPress={onRetry} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: spacing[2], paddingVertical: spacing[4] },
});

export default ListFooterRetry;
