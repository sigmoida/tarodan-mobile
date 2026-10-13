import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '@/ui';

import { styles } from '../_lib/styles';

/** Kapı (IBAN / kargo adresi) durumu okunurken gösterilen yükleniyor göstergesi. */
export function GateLoading() {
  return (
    <View style={styles.limitsPlaceholder}>
      <ActivityIndicator size="small" color={theme.colors.primary[600]!} />
    </View>
  );
}
