import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RawText, theme } from '@/ui';
import { AuthShell } from '../AuthShell';
import { AuthFooterLink } from '../AuthFooterLink';

jest.mock('@/components/hero/AuthHeroBanner', () => ({ AuthHeroBanner: () => null }));

describe('AuthShell', () => {
  it('beyaz zemin, sola dayalı başlık + açıklama, form ve alt bağlantılar', () => {
    render(
      <AuthShell
        testID="auth"
        title="Tekrar hoş geldiniz"
        description="Hesabınıza giriş yapın"
        footer={<RawText>alt bağlantı</RawText>}
      >
        <RawText>form</RawText>
      </AuthShell>,
    );
    expect(screen.getByText('Tekrar hoş geldiniz')).toBeTruthy();
    expect(screen.getByText('Hesabınıza giriş yapın')).toBeTruthy();
    expect(screen.getByText('form')).toBeTruthy();
    expect(screen.getByText('alt bağlantı')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('auth').props.style).backgroundColor).toBe(
      theme.colors.surface.elevated,
    );
  });

  it('geri bağlantısı etiketiyle çizilir ve basılınca çağrılır', () => {
    const onPress = jest.fn();
    render(
      <AuthShell title="X" back={{ label: 'Ana sayfaya dön', onPress, testID: 'geri' }}>
        <RawText>form</RawText>
      </AuthShell>,
    );
    fireEvent.press(screen.getByTestId('geri'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Ana sayfaya dön')).toBeTruthy();
  });

  it('geri bağlantısı verilmezse çizilmez', () => {
    render(
      <AuthShell title="X">
        <RawText>form</RawText>
      </AuthShell>,
    );
    expect(screen.queryByTestId('geri')).toBeNull();
  });
});

describe('AuthFooterLink', () => {
  it('bağlantı etiketine basınca çağrılır', () => {
    const onPress = jest.fn();
    render(<AuthFooterLink prompt="Hesabınız yok mu?" linkLabel="Kayıt ol" onPress={onPress} />);
    fireEvent.press(screen.getByText('Kayıt ol'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
