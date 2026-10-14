/** +90 kutusu numara alanıyla AYNI yüzey (zemin, çerçeve, yükseklik); hata iki kutuda da. */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { PhoneInput } from '../PhoneInput';

const SURFACE_KEYS = ['backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'minHeight'] as const;

function pick(style: unknown) {
  const flat = StyleSheet.flatten(style as never) as Record<string, unknown>;
  return Object.fromEntries(SURFACE_KEYS.map((k) => [k, flat[k]]));
}

function inputBox() {
  let node: ReturnType<typeof screen.getByTestId> | null = screen.getByTestId('ph');
  while (node && !StyleSheet.flatten(node.props.style)?.borderWidth) node = node.parent;
  return node?.props.style;
}

function codeBox() {
  let node: ReturnType<typeof screen.getByText> | null = screen.getByText('+90');
  while (node && !StyleSheet.flatten(node.props.style)?.borderWidth) node = node.parent;
  return node?.props.style;
}

describe('PhoneInput yüzeyi', () => {
  it('+90 kutusu numara alanıyla aynı zemin/çerçeve/yükseklik', () => {
    render(<PhoneInput testID="ph" phone="" onPhoneChange={jest.fn()} label="Telefon" />);
    expect(pick(codeBox())).toEqual(pick(inputBox()));
  });

  it('hata: iki kutu da hata çerçevesi', () => {
    render(<PhoneInput testID="ph" phone="" onPhoneChange={jest.fn()} error="Geçersiz" />);
    expect(pick(codeBox())).toEqual(pick(inputBox()));
    expect(StyleSheet.flatten(codeBox()).borderColor).toBe(StyleSheet.flatten(inputBox()).borderColor);
    expect(screen.getByText('Geçersiz')).toBeTruthy();
  });
});
