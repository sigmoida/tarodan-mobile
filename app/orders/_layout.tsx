import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';
import { theme } from '@/ui';

const { colors } = theme;

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        ...stackScreenOptions,
        contentStyle: { backgroundColor: colors.surface.DEFAULT },
      }}
    >
      {/* Form ekranları (eskiden modal). Kirli formdan çıkış `useFormScreenExit` onayından
          geçer; iOS kaydırarak geri dönüş o onayı atlayamasın diye kapalı. */}
      <Stack.Screen name="[id]/refund" options={{ gestureEnabled: false }} />
      <Stack.Screen name="[id]/review" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
