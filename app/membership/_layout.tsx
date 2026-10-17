import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/lib/navigation/screenOptions';
import { theme } from '@/ui';

export default function MembershipLayout() {
  return (
    <Stack
      screenOptions={{
        ...stackScreenOptions,
        contentStyle: {
          backgroundColor: theme.colors.white,
        },
      }}
    />
  );
}
