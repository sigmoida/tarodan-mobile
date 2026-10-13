import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';

export default function BrandsLayout() {
  return (
    <Stack
      screenOptions={stackScreenOptions}
    />
  );
}
