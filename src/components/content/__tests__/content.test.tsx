import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RawText } from '@/ui';
import { backMock, canGoBackMock, replaceMock, resetRouterMocks } from '@/test-utils/router-mock';
import { ContentPage } from '../ContentPage';
import { DocLink, DocList, DocNote, DocSection, DocText } from '../DocBlocks';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

describe('ContentPage', () => {
  beforeEach(() => resetRouterMocks());

  it('başlık yalnız üst barda; açıklama PageHeader bandında', () => {
    render(
      <ContentPage title="Hakkımızda" description="Tarodan hikâyesi">
        <RawText>gövde</RawText>
      </ContentPage>,
    );
    expect(screen.getAllByText('Hakkımızda')).toHaveLength(1);
    expect(screen.getByText('Tarodan hikâyesi')).toBeTruthy();
    expect(screen.getByText('gövde')).toBeTruthy();
  });

  it('açıklama ve aksiyon yoksa PageHeader çizilmez', () => {
    render(
      <ContentPage title="SSS">
        <RawText>gövde</RawText>
      </ContentPage>,
    );
    expect(screen.queryByTestId('page-header-accent')).toBeNull();
  });

  it('geri: geçmiş varsa geri, yoksa ana sekmelere', () => {
    canGoBackMock.mockReturnValue(true);
    const { unmount } = render(<ContentPage title="X" />);
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(backMock).toHaveBeenCalled();
    unmount();

    canGoBackMock.mockReturnValue(false);
    render(<ContentPage title="X" />);
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
  });
});

describe('DocBlocks', () => {
  it('bölüm başlığı, paragraf, liste ve not çizilir', () => {
    render(
      <DocSection title="Süreç">
        <DocText>paragraf</DocText>
        <DocList items={['bir', 'iki']} />
        <DocList items={['a']} ordered />
        <DocNote>dikkat</DocNote>
      </DocSection>,
    );
    expect(screen.getByText('Süreç')).toBeTruthy();
    expect(screen.getByText('paragraf')).toBeTruthy();
    expect(screen.getAllByText('•')).toHaveLength(2);
    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('dikkat')).toBeTruthy();
  });

  it('bağlantı satırı basılınca çağrılır', () => {
    const onPress = jest.fn();
    render(<DocLink label="Koşullar" onPress={onPress} />);
    fireEvent.press(screen.getByText('Koşullar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
