import React from 'react';
import { View } from 'react-native';
import { Button, SectionCard, Text } from '@/ui';
import { styles } from '../_lib/styles';

interface SettingsActionCardProps {
  title: string;
  /** Başlığın yanında durum rozeti (Aktif / Doğrulandı). */
  badge?: React.ReactNode;
  /** Başlığın altında tek satırlık açıklama / durum. */
  description: string;
  /** Sağdaki eylem; verilmezse (ör. telefon zaten doğrulanmış) yalnız durum gösterilir. */
  action?: {
    label: string;
    onPress: () => void;
    /** Yıkıcı eylem (tüm cihazlardan çıkış): aynı yerde `danger` varyant. */
    destructive?: boolean;
    disabled?: boolean;
    isLoading?: boolean;
    testID: string;
  };
  testID?: string;
}

/**
 * Güvenlik ekranının TEK kart kalıbı: başlık (+ rozet), altında açıklama satırı ve sağda aynı tip
 * eylem düğmesi (`outline` sm; yıkıcıysa `danger` sm). Kartların hepsi aynı hizada durur.
 */
export function SettingsActionCard({ title, badge, description, action, testID }: SettingsActionCardProps) {
  return (
    <SectionCard title={title} badge={badge} testID={testID}>
      <View style={styles.settingRow}>
        <Text variant="bodySm" tone="muted" style={styles.settingText}>
          {description}
        </Text>
        {action ? (
          <Button
            variant={action.destructive ? 'danger' : 'outline'}
            size="sm"
            title={action.label}
            onPress={action.onPress}
            disabled={action.disabled}
            isLoading={action.isLoading}
            testID={action.testID}
          />
        ) : null}
      </View>
    </SectionCard>
  );
}
