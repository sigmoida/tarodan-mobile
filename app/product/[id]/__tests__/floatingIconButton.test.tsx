/**
 * Yüzen ada butonu: iOS 26'da GlassView, değilse düz yüzey (fallback); testID/erişilebilirlik,
 * dokunma, devre dışı ve sayaç davranışı iki dalda aynı.
 */
import React from 'react';
import { View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FloatingIconButton, FLOATING_BUTTON_SIZE } from '../_components/FloatingIconButton';
import { getGlassView } from '../_lib/glass';

jest.mock('../_lib/glass', () => ({ getGlassView: jest.fn(() => null) }));
const getGlassViewMock = getGlassView as jest.Mock;

function Glass(props: any) {
  return <View testID="glass-view" {...props} />;
}

const renderButton = (over: Record<string, unknown> = {}) => {
  const onPress = jest.fn();
  render(
    <FloatingIconButton
      testID="product-favorite-button"
      icon="heart-outline"
      accessibilityLabel="Favorilere ekle"
      onPress={onPress}
      {...over}
    />,
  );
  return onPress;
};

describe.each([
  ['fallback (cam yok)', null],
  ['Liquid Glass', Glass],
])('FloatingIconButton — %s', (_name, glass) => {
  beforeEach(() => getGlassViewMock.mockReturnValue(glass));

  it('testID + etiket korunur, basınca onPress çalışır', () => {
    const onPress = renderButton();
    expect(screen.getByLabelText('Favorilere ekle')).toBeTruthy();
    fireEvent.press(screen.getByTestId('product-favorite-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('devre dışıyken basılamaz', () => {
    const onPress = renderButton({ disabled: true });
    fireEvent.press(screen.getByTestId('product-favorite-button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('sayaç rozeti count > 0 iken çizilir', () => {
    renderButton({ count: 3 });
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('dokunma alanı en az 44pt', () => {
    renderButton();
    const style = Object.assign({}, ...[screen.getByTestId('product-favorite-button').props.style].flat());
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBe(FLOATING_BUTTON_SIZE);
  });
});

describe('cam dalı', () => {
  it('Liquid Glass varsa GlassView çizilir, yoksa çizilmez', () => {
    getGlassViewMock.mockReturnValue(Glass);
    const { unmount } = render(
      <FloatingIconButton icon="share-outline" accessibilityLabel="Paylaş" onPress={jest.fn()} />,
    );
    expect(screen.getByTestId('glass-view')).toBeTruthy();
    unmount();
    getGlassViewMock.mockReturnValue(null);
    render(<FloatingIconButton icon="share-outline" accessibilityLabel="Paylaş" onPress={jest.fn()} />);
    expect(screen.queryByTestId('glass-view')).toBeNull();
  });
});
