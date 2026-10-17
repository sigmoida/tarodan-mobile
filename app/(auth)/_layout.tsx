import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';

export default function AuthLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="login/index" />
      <Stack.Screen name="register/index" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
