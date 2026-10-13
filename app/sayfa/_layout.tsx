import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';

export default function SayfaLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
