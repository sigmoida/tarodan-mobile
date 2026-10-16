import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { heroReservedHeight } from '../_lib/heroLayout';
import { heroStyles as s } from '../_lib/heroStyles';

/**
 * Slaytlar yüklenirken hero'nun yerini tutar (içerik geç gelen slayt yüzünden zıplamasın).
 * Yalnız son bilinen durumda hero görünürse çizilir — bkz. `useLastHadSlides`.
 */
export function HeroReserved() {
  const { width } = useWindowDimensions();
  return <View style={[s.reserved, { height: heroReservedHeight(width) }]} testID="hero-reserved" />;
}
