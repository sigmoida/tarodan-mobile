import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ChipTabs, PAGE_GUTTER } from '@/ui';

const items = [
  { key: 'all', label: 'Tümü', count: 5 },
  { key: 'pending', label: 'Bekleyen', count: 2 },
  { key: 'cancelled', label: 'İptal', count: 0 },
];

describe('ChipTabs', () => {
  it('"Etiket (n)" biçimi: count verilmeyen sekmede sayı yok, 0 da gösterilir', () => {
    render(
      <ChipTabs
        testID="tabs"
        value="all"
        onChange={jest.fn()}
        items={[...items, { key: 'x', label: 'Sayaçsız' }]}
      />,
    );
    expect(screen.getByText('Tümü (5)')).toBeOnTheScreen();
    expect(screen.getByText('İptal (0)')).toBeOnTheScreen();
    expect(screen.getByText('Sayaçsız')).toBeOnTheScreen();
  });

  it('seçimi bildirir; a11y rolü tab + selected', () => {
    const onChange = jest.fn();
    render(<ChipTabs testID="tabs" value="all" onChange={onChange} items={items} />);
    fireEvent.press(screen.getByTestId('tabs-pending'));
    expect(onChange).toHaveBeenCalledWith('pending');
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toBeSelected();
    expect(tabs[1]).not.toBeSelected();
  });

  it('item.testID, varsayılan `${testID}-${key}` kuralını ezer', () => {
    render(
      <ChipTabs
        testID="tabs"
        value="a"
        onChange={jest.fn()}
        items={[
          { key: 'a', label: 'A', testID: 'tab-a' },
          { key: 'b', label: 'B' },
        ]}
      />,
    );
    expect(screen.getByTestId('tab-a')).toBeOnTheScreen();
    expect(screen.getByTestId('tabs-b')).toBeOnTheScreen();
  });

  it('dikeyde gerilmez: kaydırma alanı flexGrow 0', () => {
    render(<ChipTabs testID="tabs" value="all" onChange={jest.fn()} items={items} />);
    const scroll = screen.getByTestId('tabs');
    expect(StyleSheet.flatten(scroll.props.style).flexGrow).toBe(0);
    expect(scroll.props.horizontal).toBe(true);
  });

  it("bleed: sayfa gutter'ına taşar; bleed=false düz", () => {
    const { rerender } = render(<ChipTabs testID="tabs" value="all" onChange={jest.fn()} items={items} />);
    expect(StyleSheet.flatten(screen.getByTestId('tabs').props.style).marginHorizontal).toBe(-PAGE_GUTTER);
    rerender(<ChipTabs testID="tabs" bleed={false} value="all" onChange={jest.fn()} items={items} />);
    expect(StyleSheet.flatten(screen.getByTestId('tabs').props.style).marginHorizontal).toBeUndefined();
  });
});
