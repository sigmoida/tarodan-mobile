import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { CountBadge, ScreenHeader, TopBarAction, TopBarLabel, theme } from '@/ui';

const { colors } = theme;
const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

describe('ScreenHeader — yüzen cam butonlu, ortalı başlıklı bar', () => {
  it('başlık ORTALI (h3 bold, tek satır ellipsis); geri oku cam daire, başlık renginde, onBack çağırır', () => {
    const onBack = jest.fn();
    render(<ScreenHeader title="Adreslerim" onBack={onBack} variant="primary" />);
    const title = screen.getByText('Adreslerim');
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '700',
      textAlign: 'center',
    });
    expect(title.props.numberOfLines).toBe(1);
    expect(screen.getByTestId('icon-chevron-left').props.stroke).toBe(colors.text.heading);
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(onBack).toHaveBeenCalled();
  });

  it('geri oku testID ve erişilebilirlik etiketi korunur (Maestro: text "Geri")', () => {
    render(<ScreenHeader title="X" onBack={jest.fn()} />);
    expect(screen.getByTestId('screen-header-back').props.accessibilityLabel).toBe('Geri');
  });

  it('geri oku yokken sol slot BOŞ kalır ama başlık yine ortada (iki yan slot eşit genişlik)', () => {
    render(<ScreenHeader title="Profil" showBack={false} />);
    expect(screen.queryByLabelText('Geri')).toBeNull();
    const left = flat('screen-header-left');
    const right = flat('screen-header-right');
    expect(left.width).toBe(right.width);
    expect(within(screen.getByTestId('screen-header-left')).queryAllByRole('button')).toHaveLength(0);
  });

  it('yan slotlar geniş olana eşitlenir: sağ aksiyon genişleyince sol de aynı genişliği ayırır', () => {
    render(<ScreenHeader title="Bildirimler" showBack={false} right={<TopBarAction label="Tümünü oku" onPress={jest.fn()} />} />);
    const rightInner = screen.getByTestId('screen-header-right').children[0] as any;
    fireEvent(rightInner, 'layout', { nativeEvent: { layout: { width: 120, height: 40, x: 0, y: 0 } } });
    expect(flat('screen-header-left').width).toBe(120);
    expect(flat('screen-header-right').width).toBe(120);
  });

  it('yan slot genişliği pencere genişliğinin oranıyla sınırlı (uzun aksiyon başlığı ezmez)', () => {
    render(<ScreenHeader title="X" right={<TopBarAction label="Uzun bir aksiyon metni" onPress={jest.fn()} />} />);
    const rightInner = screen.getByTestId('screen-header-right').children[0] as any;
    fireEvent(rightInner, 'layout', { nativeEvent: { layout: { width: 380, height: 40, x: 0, y: 0 } } });
    expect(flat('screen-header-right').width).toBeLessThan(380);
    expect(flat('screen-header-left').width).toBe(flat('screen-header-right').width);
  });

  it('TopBarAction: ikon = cam daire (başlık rengi, sayaç rozeti); metin = cam hap (primary-600)', () => {
    const onPress = jest.fn();
    render(
      <ScreenHeader
        title="X"
        right={
          <>
            <TopBarAction icon="cart-outline" accessibilityLabel="Sepet" count={3} onPress={onPress} testID="act-cart" />
            <TopBarAction label="Kaydet" onPress={onPress} testID="act-save" />
          </>
        }
      />,
    );
    expect(screen.getByTestId('icon-shopping-cart').props.stroke).toBe(colors.text.heading);
    expect(screen.getByLabelText('Sepet')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('Kaydet').props.style).color).toBe(colors.primary[600]);
    fireEvent.press(screen.getByTestId('act-cart'));
    fireEvent.press(screen.getByTestId('act-save'));
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('TopBarAction metin: pasifken basılmaz; TopBarLabel salt gösterim hapı', () => {
    const onPress = jest.fn();
    render(
      <ScreenHeader
        title="X"
        right={
          <>
            <TopBarAction label="Kaydet" disabled onPress={onPress} testID="act-save" />
            <TopBarLabel>3/5</TopBarLabel>
          </>
        }
      />,
    );
    fireEvent.press(screen.getByTestId('act-save'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText('3/5')).toBeTruthy();
  });

  it('varsayılan YÜZEN: absolute, zeminsiz, kenar şeridi var (bağlı değilse sabit)', () => {
    render(<ScreenHeader title="X" />);
    const bar = flat('screen-header');
    expect(bar).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0 });
    expect(bar.backgroundColor).toBeUndefined();
    expect(screen.getByTestId('screen-header-edge')).toBeTruthy();
    expect(flat('screen-header-edge').backgroundColor).toBe(colors.overlay.white95);
  });

  it('floating={false}: akışta, opak surface-elevated zemin, kenar şeridi yok', () => {
    render(<ScreenHeader title="X" floating={false} />);
    const bar = flat('screen-header');
    expect(bar.position).toBeUndefined();
    expect(bar.backgroundColor).toBe(colors.surface.elevated);
    expect(screen.queryByTestId('screen-header-edge')).toBeNull();
  });

  it('transparent: zemin ve şerit yok, konum çağıranda', () => {
    render(<ScreenHeader title="Galeri" transparent />);
    expect(flat('screen-header').backgroundColor).toBeUndefined();
    expect(flat('screen-header').position).toBeUndefined();
    expect(screen.queryByTestId('screen-header-edge')).toBeNull();
  });
});

describe('CountBadge', () => {
  it('danger-500, 99+ sınırı, 0 iken yok', () => {
    const { rerender } = render(<CountBadge count={0} testID="cb" />);
    expect(screen.queryByTestId('cb')).toBeNull();
    rerender(<CountBadge count={150} testID="cb" />);
    expect(screen.getByText('99+')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('cb').props.style).backgroundColor).toBe(colors.danger[500]);
  });
});
