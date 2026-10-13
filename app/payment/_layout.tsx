import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';

export default function PaymentLayout() {
  return (
    <Stack
      screenOptions={stackScreenOptions}
    />
  );
}
