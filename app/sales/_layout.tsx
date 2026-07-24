import { Stack } from 'expo-router';
import { theme } from '@/ui';

const { colors } = theme;

export default function SalesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface.DEFAULT },
      }}
    />
  );
}
