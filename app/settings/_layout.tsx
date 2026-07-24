import { Stack } from 'expo-router';
import { theme } from '@/ui';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.gray[50] },
      }}
    />
  );
}
