import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';

export default function UreticilerLayout() {
  return (
    <Stack
      screenOptions={stackScreenOptions}
    />
  );
}
