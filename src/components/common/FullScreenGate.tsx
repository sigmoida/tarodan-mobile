import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Icon, theme, useHeaderTopInset, type IconName } from '@/ui';
import { keyboardBottomInset, useKeyboardHeight } from '@/hooks/useKeyboardHeight';

const { colors, spacing, radius } = theme;

/**
 * Kapatılamaz tam ekran kapıların TEK öncelik sırası — önce gelen üstte kalır.
 * Zorunlu güncelleme her şeyin üstünde: güncelleme gerekiyorsa üye önce onu
 * görür (eski build'den onay göndermenin anlamı yok); zorunlu adımlar
 * (sözleşme onayı, B3'te kimlik) onun altında.
 *
 * Kapılar native `Modal` olduğundan z-sırası `zIndex` ile değil, AYNI ANDA
 * YALNIZ BİR kapı sunularak sağlanır: üst katman istekteyken alttaki gizlenir.
 */
export const FULL_SCREEN_GATE_LAYERS = ['forceUpdate', 'requiredSteps'] as const;
export type FullScreenGateLayer = (typeof FULL_SCREEN_GATE_LAYERS)[number];

/** Hangi kapılar şu an ekranda olmak istiyor (yalnız UI durumu, fetch yok). */
const useGateRequests = create<{
  requested: Partial<Record<FullScreenGateLayer, true>>;
  setRequested: (layer: FullScreenGateLayer, on: boolean) => void;
}>((set) => ({
  requested: {},
  setRequested: (layer, on) =>
    set((s) => {
      const requested = { ...s.requested };
      if (on) requested[layer] = true;
      else delete requested[layer];
      return { requested };
    }),
}));

/** İstekteki kapılardan en üstte olanı (yoksa null). */
export function topFullScreenGate(
  requested: Partial<Record<FullScreenGateLayer, true>>,
): FullScreenGateLayer | null {
  return FULL_SCREEN_GATE_LAYERS.find((l) => requested[l]) ?? null;
}

/**
 * Bir tam ekran kapı ekranda mı? Kök düzen bunu `AlertDialogHost`u kapı
 * açıkken ertelemek için kullanır: kapının üstünde temalı uyarı açılmasın
 * (Android'de kapının üstüne biner; iOS'ta kapı sunuluyken ikinci modal hiç
 * sunulamaz ve kuyruk kilitlenir). Erteleme süresince `appAlert` kuyruğa
 * düşer, kapı kapanınca gösterilir.
 */
export function useFullScreenGateShown(): boolean {
  return useGateRequests((s) => topFullScreenGate(s.requested) !== null);
}

/** iOS'ta sunum düşerse yeniden deneme aralığı (aşağıdaki nota bkz.). */
export const GATE_PRESENT_RETRY_MS = 1500;

export interface FullScreenGateProps {
  layer: FullScreenGateLayer;
  children: ReactNode;
  /**
   * Android geri tuşu. Verilmezse yutulur (kapatılamaz kapılar). Yalnız
   * alternatif çıkışı olan kapı verir: kimlik adımında "Vazgeç".
   */
  onBackPress?: () => void;
  testID?: string;
}

/**
 * Tam ekran kapıların ortak kabuğu (`ForceUpdateGate`, `RequiredStepShell`).
 * Bağlıyken kendini native, tam ekran bir `Modal` olarak sunar: kök düzendeki
 * düz bir View, açık bir ekran Modal'ının ya da `AlertDialogHost`un ALTINDA
 * kalıp onları etkileşimli bırakıyordu. Kapatılamaz: Android geri tuşu
 * (`onRequestClose`) yutulur (`onBackPress` verilmedikçe), iOS'ta kaydırarak kapatma yoktur, kapatma
 * düğmesi yoktur. İçerik düzeni çağırana aittir.
 *
 * iOS notu: RN modalı kök view controller'dan sunar; o anda başka bir modal
 * sunuluyorsa (ya da biri kapanıyorsa) UIKit sunumu sessizce reddeder ve RN
 * bir daha denemez. Bu yüzden `onShow` gelmezse Modal yeniden bağlanarak
 * tekrar sunulur: engelleyen modal kapanınca kapı görünür. Kapının içinde
 * `appAlert` KULLANILMAZ (ModalFreeze); hatalar satır içi gösterilir.
 */
export function FullScreenGate({ layer, children, onBackPress, testID }: FullScreenGateProps) {
  const insets = useSafeAreaInsets();
  const topInset = useHeaderTopInset();
  // Klavye: kapı kenardan kenara bir Modal (statusBar/navigationBarTranslucent);
  // Android'de edge-to-edge pencerede `adjustResize` yüzeyi küçültmez ve klavye
  // alttaki düğmeleri örter. Alt boşluk klavye yüksekliğine göre büyür, böylece
  // alt düğmeler (footer) iki platformda da klavyenin üstünde kalır ve gövde
  // (ScrollView) kalan alanda kaydırılabilir. KeyboardAvoidingView yerine: o
  // da aynı olaylara dayanıyor ama Android `height` modu kenardan kenara
  // pencerede güvenli alanı hesaba katmıyor.
  const keyboardHeight = useKeyboardHeight();
  const paddingBottom = keyboardBottomInset(keyboardHeight, insets.bottom);
  const setRequested = useGateRequests((s) => s.setRequested);
  const top = useGateRequests((s) => topFullScreenGate(s.requested));
  // Yalnız istekteki EN ÜST kapı sunulur; daha öncelikli bir kapı istekteyse
  // bu kapı gizli bekler. Kayıt efektten önce sunulmaz: aynı anda bağlanan
  // iki kapı tek kare bile üst üste binmez.
  const shown = top === layer;

  useEffect(() => {
    setRequested(layer, true);
    return () => setRequested(layer, false);
  }, [layer, setRequested]);

  const [presented, setPresented] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!shown) setPresented(false);
  }, [shown]);
  useEffect(() => {
    if (Platform.OS !== 'ios' || !shown || presented) return undefined;
    const id = setTimeout(() => setAttempt((a) => a + 1), GATE_PRESENT_RETRY_MS);
    return () => clearTimeout(id);
  }, [shown, presented, attempt]);

  return (
    <Modal
      key={attempt}
      visible={shown}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => onBackPress?.()}
      onShow={() => setPresented(true)}
    >
      <View
        style={[styles.surface, { paddingTop: topInset, paddingBottom }]}
        accessibilityViewIsModal
        testID={testID}
      >
        {children}
      </View>
    </Modal>
  );
}

/** Kapıların ortak ikon dairesi. */
export function FullScreenGateIcon({ name, size = 80 }: { name: IconName; size?: number }) {
  return (
    <View style={[styles.iconCircle, { width: size, height: size }]}>
      <Icon name={name} size={size / 2} color={colors.primary[600]!} />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  iconCircle: {
    borderRadius: radius.full,
    backgroundColor: colors.primary[50]!,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
});
