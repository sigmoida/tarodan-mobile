import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RawText, theme } from '@/ui';
import { AuthShell } from '../AuthShell';
import { AuthFooterLink } from '../AuthFooterLink';
import { RegisterAccountTabs } from '../RegisterAccountTabs';
import { PasswordChecklist, passwordChecks } from '../PasswordChecklist';
import { replaceMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/components/hero/AuthHeroBanner', () => ({ AuthHeroBanner: () => null }));

describe('AuthShell', () => {
  beforeEach(() => resetRouterMocks());

  it('başlık YALNIZ üst barda; logo yok, içerikte başlık tekrarı yok', () => {
    render(
      <AuthShell title="Giriş Yap" footer={<RawText>alt bağlantı</RawText>}>
        <RawText>form</RawText>
      </AuthShell>,
    );
    // Tek bir "Giriş Yap" metni: üst bardaki başlık (içerikte ikinci h1 yok).
    expect(screen.getAllByText('Giriş Yap')).toHaveLength(1);
    expect(screen.getByRole('header', { name: 'Giriş Yap' })).toBeTruthy();
    expect(screen.queryByTestId('brand-logo')).toBeNull();
    expect(screen.getByText('form')).toBeTruthy();
    expect(screen.getByText('alt bağlantı')).toBeTruthy();
  });

  it('içerik beyaz zeminde çizilir (kartsız)', () => {
    render(
      <AuthShell title="X" testID="auth">
        <RawText>form</RawText>
      </AuthShell>,
    );
    const scroll = screen.UNSAFE_getByType(ScrollView);
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle).backgroundColor).toBe(
      theme.colors.surface.elevated,
    );
  });

  it('açıklama verilirse formun üstünde paragraf olarak çizilir', () => {
    render(
      <AuthShell title="X" description="Bağlantı gönderildi">
        <RawText>form</RawText>
      </AuthShell>,
    );
    expect(screen.getByText('Bağlantı gönderildi')).toBeTruthy();
  });

  it('geri oku basılınca onBack çağrılır', () => {
    const onBack = jest.fn();
    render(
      <AuthShell title="X" onBack={onBack}>
        <RawText>form</RawText>
      </AuthShell>,
    );
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('showBack=false iken geri oku çizilmez', () => {
    render(
      <AuthShell title="X" showBack={false}>
        <RawText>form</RawText>
      </AuthShell>,
    );
    expect(screen.queryByLabelText('Geri')).toBeNull();
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

describe('RegisterAccountTabs', () => {
  beforeEach(() => resetRouterMocks());

  it('seçili sekme seçili durumda; diğerine basınca rotayı değiştirir', () => {
    render(<RegisterAccountTabs active="individual" />);
    expect(screen.getByTestId('register-tab-individual').props.accessibilityState.selected).toBe(true);
    fireEvent.press(screen.getByTestId('register-tab-corporate'));
    expect(replaceMock).toHaveBeenCalledWith('/(auth)/register-business');
  });

  it('seçili sekmeye basmak yönlendirmez', () => {
    render(<RegisterAccountTabs active="corporate" />);
    fireEvent.press(screen.getByTestId('register-tab-corporate'));
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

describe('PasswordChecklist', () => {
  it('kuralları web ile aynı hesaplar', () => {
    expect(passwordChecks('Abcdef12')).toEqual({
      hasMinLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasNumber: true,
    });
    expect(passwordChecks('abc')).toEqual({
      hasMinLength: false,
      hasUppercase: false,
      hasLowercase: true,
      hasNumber: false,
    });
  });

  it('dört gereksinim satırını çizer', () => {
    render(<PasswordChecklist password="abc" />);
    expect(screen.getByTestId('password-checklist')).toBeTruthy();
    expect(screen.getByText('Büyük harf (A-Z)')).toBeTruthy();
  });
});
