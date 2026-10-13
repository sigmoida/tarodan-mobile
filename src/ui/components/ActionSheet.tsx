import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../lib/theme';
import { BottomSheet, useBottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Text } from './Text';

export interface ActionSheetAction {
  /** Liste anahtarı (verilmezse etiket). */
  key?: string;
  label: string;
  /**
   * Sheet TAMAMEN kapandıktan sonra çalışır (iOS donma kuralı §12): eylem appAlert, başka bir
   * Modal/sheet, galeri ya da yönlendirme açabilir.
   */
  onPress: () => void;
  /** Yıkıcı eylem (sil, engelle…): kırmızı etiket. */
  destructive?: boolean;
  disabled?: boolean;
  testID?: string;
}

export interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actions: ReadonlyArray<ActionSheetAction>;
  /** Başlık (verilmezse yalnız tutamaç + eylemler). */
  title?: string;
  /** Başlığın altında kısa açıklama. */
  message?: string;
  /** En alttaki ayrı "Vazgeç" düğmesinin etiketi. */
  cancelLabel?: string;
  /** Köke; satırlar `action.testID` ya da `${testID}-action-${index}`, vazgeç `${testID}-cancel`. */
  testID?: string;
}

const { colors, spacing, controlHeight } = theme;

/**
 * Eylem menüsü — HIG "Action sheet" / M3 "Bottom sheet" karşılığı. appAlert düğmeleriyle menü
 * YAPILMAZ. Satır: etiket (yıkıcıysa kırmızı, pasifse soluk), ikon yok (§14); en altta sabit
 * [Vazgeç]. Satıra basınca ÖNCE sheet kapanır, eylem kapanış bittikten SONRA çalışır
 * (`useBottomSheet().runAfterClose`).
 */
export function ActionSheet({
  isOpen,
  onClose,
  actions,
  title,
  message,
  cancelLabel,
  testID = 'action-sheet',
}: ActionSheetProps) {
  const { t } = useTranslation();
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      flushBody
      testID={testID}
      footer={
        <Button
          variant="outline"
          fullWidth
          title={cancelLabel ?? t('common.giveUp')}
          onPress={onClose}
          testID={`${testID}-cancel`}
        />
      }
    >
      {message ? (
        <Text variant="bodySm" tone="muted" style={styles.message}>
          {message}
        </Text>
      ) : null}
      <View style={styles.list}>
        {actions.map((action, index) => (
          <ActionRow
            key={action.key ?? action.label}
            action={action}
            testID={action.testID ?? `${testID}-action-${index}`}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

function ActionRow({ action, testID }: { action: ActionSheetAction; testID: string }) {
  const { runAfterClose } = useBottomSheet();
  return (
    <Pressable
      testID={testID}
      disabled={action.disabled}
      onPress={() => runAfterClose(action.onPress)}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!action.disabled }}
      android_ripple={Platform.OS === 'android' ? { color: colors.overlay.black10 } : undefined}
      style={({ pressed }) => [
        styles.row,
        pressed && Platform.OS === 'ios' && styles.rowPressed,
        action.disabled && styles.rowDisabled,
      ]}
    >
      <Text variant="body" weight="medium" tone={action.destructive ? 'danger' : 'heading'} numberOfLines={2}>
        {action.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  message: { paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  list: { paddingVertical: spacing[2] },
  row: {
    minHeight: controlHeight.lg,
    justifyContent: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  rowPressed: { backgroundColor: colors.surface.alt },
  rowDisabled: { opacity: 0.5 },
});
