import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRichMessage, useRichMessage } from '../useRichMessage';

describe('renderRichMessage', () => {
  it('etiketleri düğüme çevirir, düz metni korur', () => {
    const onTerms = jest.fn();
    const nodes = renderRichMessage('<terms>Şartlar</terms> ve <privacy>Gizlilik</privacy> kabul.', {
      terms: (c) => <Text onPress={onTerms}>{c}</Text>,
      privacy: (c) => <Text>{c}</Text>,
    });
    render(<Text>{nodes}</Text>);
    expect(screen.getByText(/ve/)).toBeTruthy();
    fireEvent.press(screen.getByText('Şartlar'));
    expect(onTerms).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Gizlilik')).toBeTruthy();
  });

  it("ICU kaçışını ('' → ') çözer ve bilinmeyen etiketi düz metin bırakır", () => {
    const nodes = renderRichMessage("<x>Ayşe</x>''nin <y>kitabı</y>", {
      x: (c) => <Text>{c}</Text>,
    });
    render(<Text>{nodes}</Text>);
    expect(screen.getByText("Ayşe'nin kitabı")).toBeTruthy();
  });
});

describe('useRichMessage', () => {
  it('katalog anahtarını etiketli şablon olarak çizer (kayıt onayı)', () => {
    const Probe = () => {
      const nodes = useRichMessage('auth.termsAgreeRich', {
        terms: (c) => <Text testID="terms-link">{c}</Text>,
        privacy: (c) => <Text testID="privacy-link">{c}</Text>,
      });
      return <Text>{nodes}</Text>;
    };
    render(<Probe />);
    expect(screen.getByTestId('terms-link').props.children).toBe('Kullanım Şartları');
    expect(screen.getByTestId('privacy-link').props.children).toBe('Gizlilik Politikası');
    // Çıplak etiket kalıntısı ya da çift kesme yok.
    expect(screen.queryByText(/<terms>/)).toBeNull();
    expect(screen.queryByText(/''/)).toBeNull();
  });
});
