import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { InboxRow } from '../InboxRow';

describe('InboxRow', () => {
  it('başlık, zaman, bağlam ve ön izlemeyi gösterir; basınca onPress çağrılır', () => {
    const onPress = jest.fn();
    render(
      <InboxRow
        leading={<Text>L</Text>}
        title="Başlık"
        time="12:30"
        meta={<Text>Bağlam</Text>}
        preview="Ön izleme"
        onPress={onPress}
        testID="row"
      />,
    );
    expect(screen.getByText('Başlık')).toBeOnTheScreen();
    expect(screen.getByText('12:30')).toBeOnTheScreen();
    expect(screen.getByText('Bağlam')).toBeOnTheScreen();
    expect(screen.getByText('Ön izleme')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('row'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('adet rozeti > 99 için "99+" yazar, 0 iken gizlidir', () => {
    const { rerender } = render(<InboxRow leading={null} title="a" time="t" unreadCount={120} />);
    expect(screen.getByText('99+')).toBeOnTheScreen();
    rerender(<InboxRow leading={null} title="a" time="t" unreadCount={0} />);
    expect(screen.queryByText('99+')).toBeNull();
  });
});
