/**
 * Yükseltme çağrıları iOS ve Android'de hiç render edilmemeli (Guideline 2.1(b):
 * "references to subscriptions"). Sarmalayıcı, çağrı yerlerinin stilini
 * değiştirmeden onları tek noktadan gizler.
 */
import React from 'react';
import { Text } from 'react-native';
import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';

const renderCta = () => {
  const osValue = Platform.OS;
  let UpgradeCta: any;
  jest.isolateModules(() => {
    Platform.OS = osValue;
    UpgradeCta = require('../UpgradeCta').default;
  });
  render(
    <UpgradeCta>
      <Text>Premium'a Geç</Text>
    </UpgradeCta>,
  );
};

it('iOS: hiçbir şey render etmez', () => {
  Platform.OS = 'ios';
  renderCta();
  expect(screen.queryByText("Premium'a Geç")).toBeNull();
});

it('Android: iOS gibi hiçbir şey render etmez (Play Billing yok)', () => {
  Platform.OS = 'android';
  renderCta();
  expect(screen.queryByText("Premium'a Geç")).toBeNull();
});
