import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Button, Text, theme } from '@/ui';

const { colors, spacing, radius } = theme;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface RequiredStepAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  testID?: string;
}

export interface RequiredStepShellProps {
  icon: IoniconName;
  title: string;
  intro: string;
  /** Adımın gövdesi (onay kutuları, kimlik formu…). */
  children: ReactNode;
  /** Gönderim hatası; varsa gövdenin altında gösterilir. */
  error?: string | null;
  primary: RequiredStepAction;
  /**
   * Tek alternatif çıkış. Onay kapısında "Çıkış yap"; ihtiyaç anında açılan
   * kimlik adımında "Vazgeç" (işlem iptal). Kapatma düğmesi YOK.
   */
  secondary: RequiredStepAction;
  testID?: string;
}

/**
 * Zorunlu adımların ortak tam ekran kabuğu. ui `Modal` DEĞİL, kök düzende
 * mutlak konumlu bir katman (ForceUpdateGate gibi): iOS ModalFreeze riski yok
 * (gönderim hatası `appAlert` yerine kabuğun içinde `error` olarak gösterilir)
 * ve yasal metin sayfasına geçildiğinde katman yalnızca gizlenir. Kapatılamaz: arka
 * plana dokunmak ya da kaydırmak hiçbir şeyi kapatmaz, Android geri tuşunu
 * kapı (`RequiredStepsGate`) yutar.
 */
export function RequiredStepShell({
  icon,
  title,
  intro,
  children,
  error,
  primary,
  secondary,
  testID,
}: RequiredStepShellProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      accessibilityViewIsModal
      testID={testID}
    >
      {/* Kimlik adımında form var: klavye alt düğmeleri ve alanları örtmesin. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={40} color={colors.primary[600]!} />
          </View>
          <Text variant="h2" align="center" style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text variant="body" tone="muted" align="center" style={styles.intro}>
            {intro}
          </Text>
          <View style={styles.body}>{children}</View>
          {error ? (
            <Alert variant="danger" testID={testID ? `${testID}-error` : undefined}>
              {error}
            </Alert>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            title={primary.label}
            onPress={primary.onPress}
            disabled={primary.disabled || primary.isLoading}
            isLoading={primary.isLoading}
            testID={primary.testID}
          />
          <Button
            variant="ghost"
            fullWidth
            title={secondary.label}
            onPress={secondary.onPress}
            disabled={secondary.disabled}
            isLoading={secondary.isLoading}
            testID={secondary.testID}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // ForceUpdateGate (9999) bunun üstünde kalmalı: güncelleme zorunluysa önce o.
    zIndex: 9000,
    elevation: 9000,
    backgroundColor: colors.surface.DEFAULT,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primary[50]!,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  title: { marginBottom: spacing[2] },
  intro: { marginBottom: spacing[6] },
  body: { gap: spacing[4], marginBottom: spacing[4] },
  footer: {
    gap: spacing[2],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.DEFAULT,
  },
});
