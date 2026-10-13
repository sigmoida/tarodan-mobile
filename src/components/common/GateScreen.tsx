import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, theme, type EmptyStateProps } from '@/ui';

const { colors, spacing } = theme;

export interface GateScreenProps {
  icon: EmptyStateProps['icon'];
  title: string;
  description: string;
  /** Başlık altı ek içerik (ek açıklama, uyarı kutusu…). */
  children?: React.ReactNode;
  /** Düğmeler — tam genişlikte alt alta dizilir. */
  actions?: React.ReactNode;
  testID?: string;
}

/**
 * Oturum/durum kapısı ekranlarının (banlı, kurumsal başvuru beklemede/reddedildi) ortak iskeleti:
 * güvenli alan + web EmptyState gövdesi (gri daire ikon, başlık, açıklama) + ek içerik + düğmeler.
 * Bu ekranlarda üst bar yoktur (geri dönüş kapalı); çıkış yolu `actions` içindedir.
 */
export const GateScreen: React.FC<GateScreenProps> = ({
  icon,
  title,
  description,
  children,
  actions,
  testID,
}) => (
  <SafeAreaView style={styles.root} testID={testID}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <EmptyState
        icon={icon}
        title={title}
        subtitle={description}
        action={
          <View style={styles.body}>
            {children}
            {actions ? <View style={styles.actions}>{actions}</View> : null}
          </View>
        }
      />
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing[4] },
  body: { alignSelf: 'stretch', gap: spacing[4] },
  actions: { gap: spacing[2] },
});

export default GateScreen;
