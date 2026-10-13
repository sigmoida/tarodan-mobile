import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';
import { theme } from '@/ui';

const { colors } = theme;

export default function TradeLayout() {
  // headerShown FALSE: her trade ekranı kendi in-app header'ını (ScreenHeader /
  // özel header) geri butonuyla birlikte render ediyor. Native header açık
  // kalırsa çift başlık + fazladan boşluk oluşuyordu (web'de tek header var).
  return (
    <Stack
      screenOptions={{
        ...stackScreenOptions,
        contentStyle: { backgroundColor: colors.surface.DEFAULT },
      }}
    >
      {/* İtiraz formu (eskiden modal) — taslak `disputeDraftStore`'da korunur, çıkış serbest. */}
      <Stack.Screen name="[id]/dispute" />
    </Stack>
  );
}
