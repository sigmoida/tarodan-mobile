import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';

export default function CollectionsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions} />
  );
}
