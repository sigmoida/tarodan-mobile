import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';

export default function SellerLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
