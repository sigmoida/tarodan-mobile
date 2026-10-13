import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';

export default function OffersLayout() {
  return (
    <Stack
      screenOptions={stackScreenOptions}
    />
  );
}
