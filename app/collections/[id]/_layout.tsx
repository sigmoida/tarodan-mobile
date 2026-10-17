import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';

export default function CollectionDetailLayout() {
  return (
    <Stack
      screenOptions={stackScreenOptions}
    />
  );
}
