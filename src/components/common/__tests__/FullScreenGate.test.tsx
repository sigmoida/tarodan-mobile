/**
 * B2 inceleme 9 · Tam ekran kapıların ortak kabuğu ve TEK z-sırası
 * (ForceUpdate > RequiredSteps).
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  FULL_SCREEN_GATE_LAYERS,
  FullScreenGate,
  fullScreenGateZIndex,
} from '../FullScreenGate';

describe('FullScreenGate', () => {
  it('z-sırası tek sabitten: zorunlu güncelleme zorunlu adımların üstünde', () => {
    expect(FULL_SCREEN_GATE_LAYERS).toEqual(['forceUpdate', 'requiredSteps']);
    expect(fullScreenGateZIndex('forceUpdate')).toBeGreaterThan(
      fullScreenGateZIndex('requiredSteps'),
    );
  });

  it('içeriği tam ekran, ekran okuyucuyu hapseden yüzeyde çizer', () => {
    render(
      <FullScreenGate layer="requiredSteps" testID="gate">
        <Text>içerik</Text>
      </FullScreenGate>,
    );
    const gate = screen.getByTestId('gate');
    expect(screen.getByText('içerik')).toBeOnTheScreen();
    expect(gate.props.accessibilityViewIsModal).toBe(true);
    expect(StyleSheet.flatten(gate.props.style).zIndex).toBe(
      fullScreenGateZIndex('requiredSteps'),
    );
  });
});
