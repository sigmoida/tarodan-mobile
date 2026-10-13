import { createContext, useContext, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { Alert, Button, Text, theme } from '@/ui';
import { FullScreenGate, FullScreenGateIcon } from '@/components/common/FullScreenGate';

const { colors, spacing } = theme;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Adım ekranda mı? Kapı (`RequiredStepsGate`) adım görünümünü, adım aktif
 * olduğu sürece bağlı tutar; yasal metin sayfasındayken yalnız kabuk gizlenir.
 * Böylece adımın state'i (işaretler) metni okuyup dönünce korunur.
 */
const RequiredStepVisibleContext = createContext(true);
export const RequiredStepVisibleProvider = RequiredStepVisibleContext.Provider;
export function useRequiredStepVisible(): boolean {
  return useContext(RequiredStepVisibleContext);
}

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
  /**
   * Android geri tuşu. Onay kapısında verilmez (yutulur); kimlik adımında
   * "Vazgeç" ile aynı işi yapar.
   */
  onBackPress?: () => void;
  testID?: string;
}

/**
 * Zorunlu adımların ortak tam ekran kabuğu. Yüzey, sunum ve öncelik ortak
 * `FullScreenGate`ten: native tam ekran Modal (katman `requiredSteps`,
 * `ForceUpdateGate`in altında); açık ekran modallarının ve uyarıların üstünde
 * kalır. Kapatılamaz: kapatma düğmesi yok, Android geri tuşu yutulur (kimlik
 * adımında `onBackPress` = "Vazgeç"). Yasal
 * metin sayfasındayken yalnız kabuk gizlenir (`useRequiredStepVisible`).
 * Kabuğun içinde `appAlert` KULLANILMAZ (iOS ModalFreeze): gönderim hatası
 * `error` olarak satır içi gösterilir.
 */
export function RequiredStepShell({
  icon,
  title,
  intro,
  children,
  error,
  primary,
  secondary,
  onBackPress,
  testID,
}: RequiredStepShellProps) {
  const visible = useRequiredStepVisible();
  if (!visible) return null;
  return (
    <FullScreenGate layer="requiredSteps" onBackPress={onBackPress} testID={testID}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FullScreenGateIcon name={icon} />
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
    </FullScreenGate>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
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
