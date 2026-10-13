/**
 * SelectSheet (tek/çok seçim + arama) ve ActionSheet (eylem kapanıştan SONRA çalışır).
 */
import React, { useState } from 'react';
import { Modal, Text as RNText } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ActionSheet, SelectSheet, Select, theme } from '@/ui';

const OPTIONS = [
  { value: 'ist', label: 'İstanbul' },
  { value: 'ank', label: 'Ankara' },
  { value: 'izm', label: 'İzmir' },
  { value: 'x', label: 'Kapalı', disabled: true },
];

const flush = (ms = 2000) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('SelectSheet · tek seçim', () => {
  it('seçili satır radyo olarak işaretli; satıra basınca onSelect + kapanır', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    render(
      <SelectSheet isOpen onClose={onClose} title="İl" options={OPTIONS} value="ank" onSelect={onSelect} testID="city" />,
    );
    expect(screen.getByText('İl')).toBeTruthy();
    const ank = screen.getByTestId('city-option-ank');
    expect(ank.props.accessibilityRole).toBe('radio');
    expect(ank.props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('city-option-ist').props.accessibilityState).toMatchObject({ checked: false });

    fireEvent.press(screen.getByText('İzmir'));
    expect(onSelect).toHaveBeenCalledWith('izm');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pasif satır seçilemez; closeOnSelect=false iken açık kalır', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    render(
      <SelectSheet
        isOpen
        onClose={onClose}
        title="İl"
        options={OPTIONS}
        onSelect={onSelect}
        closeOnSelect={false}
        testID="city"
      />,
    );
    fireEvent.press(screen.getByTestId('city-option-x'));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('city-option-ist'));
    expect(onSelect).toHaveBeenCalledWith('ist');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('arama Türkçe harf duyarsız süzer; sonuç yoksa satır içi boş durum', () => {
    render(
      <SelectSheet isOpen onClose={jest.fn()} title="İl" options={OPTIONS} onSelect={jest.fn()} searchable testID="city" />,
    );
    fireEvent.changeText(screen.getByTestId('city-search'), 'iz');
    expect(screen.getByText('İzmir')).toBeTruthy();
    expect(screen.queryByText('Ankara')).toBeNull();

    fireEvent.changeText(screen.getByTestId('city-search'), 'zzz');
    expect(screen.getByTestId('city-empty')).toBeTruthy();
    expect(screen.getByText('Sonuç bulunamadı')).toBeTruthy();
  });
});

describe('SelectSheet · çoklu seçim', () => {
  it('taslak işaretlenir; [Temizle] boşaltır, [Uygula] onApply + kapanır', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();
    render(
      <SelectSheet
        isOpen
        multiple
        onClose={onClose}
        title="İller"
        options={OPTIONS}
        value={['ist']}
        onApply={onApply}
        testID="cities"
      />,
    );
    expect(screen.getByTestId('cities-option-ist').props.accessibilityRole).toBe('checkbox');
    fireEvent.press(screen.getByText('Ankara'));
    // Taslak değişti ama henüz uygulanmadı.
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByTestId('cities-option-ank').props.accessibilityState).toMatchObject({ checked: true });

    fireEvent.press(screen.getByTestId('cities-apply'));
    expect(onApply).toHaveBeenCalledWith(['ist', 'ank']);
    expect(onClose).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('cities-clear'));
    fireEvent.press(screen.getByTestId('cities-apply'));
    expect(onApply).toHaveBeenLastCalledWith([]);
  });
});

describe('Select (tetikleyici + SelectSheet)', () => {
  it('tetikleyiciye basınca sheet açılır, seçince değer yazılır ve kapanır', () => {
    function Harness() {
      const [v, setV] = useState('');
      return (
        <Select label="Neden" value={v} onChange={setV} options={OPTIONS.slice(0, 3)} testID="reason" />
      );
    }
    render(<Harness />);
    expect(screen.queryByTestId('reason-sheet')).toBeNull();
    fireEvent.press(screen.getByTestId('reason'));
    expect(screen.getByTestId('reason-sheet')).toBeTruthy();
    fireEvent.press(screen.getByText('Ankara'));
    flush();
    expect(screen.queryByTestId('reason-sheet')).toBeNull();
    expect(screen.getByText('Ankara')).toBeTruthy();
  });
});

describe('ActionSheet', () => {
  function Harness({ onDelete, onEdit }: { onDelete: () => void; onEdit: () => void }) {
    const [open, setOpen] = useState(true);
    return (
      <>
        <RNText testID="state">{open ? 'open' : 'closed'}</RNText>
        <ActionSheet
          isOpen={open}
          onClose={() => setOpen(false)}
          title="İlan"
          actions={[
            { label: 'Düzenle', onPress: onEdit },
            { label: 'Pasife al', onPress: jest.fn(), disabled: true, testID: 'act-passive' },
            { label: 'Sil', onPress: onDelete, destructive: true, testID: 'act-delete' },
          ]}
          testID="menu"
        />
      </>
    );
  }

  it('satıra basınca ÖNCE kapanır; eylem native Modal kapandıktan sonra çalışır', () => {
    const onDelete = jest.fn();
    render(<Harness onDelete={onDelete} onEdit={jest.fn()} />);
    fireEvent.press(screen.getByTestId('act-delete'));
    expect(screen.getByTestId('state').children.join('')).toBe('closed');
    expect(onDelete).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(onDelete).not.toHaveBeenCalled();
    act(() => {
      screen.UNSAFE_getByType(Modal).props.onDismiss?.();
    });
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('iki hızlı dokunuş yıkıcı eylemi bir kez çalıştırır; sheet doğrudan sökülse de eylem kaybolmaz', () => {
    const onDelete = jest.fn();
    // Çağıran kapatmayı geciktiriyor (isOpen hâlâ true): satırlar ikinci dokunuşa açık kalır.
    const { unmount } = render(
      <ActionSheet
        isOpen
        onClose={() => undefined}
        actions={[{ label: 'Sil', onPress: onDelete, destructive: true, testID: 'act-delete' }]}
      />,
    );
    fireEvent.press(screen.getByTestId('act-delete'));
    fireEvent.press(screen.getByTestId('act-delete'));
    unmount();
    flush();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('yıkıcı satır kırmızı, pasif satır basılamaz, Vazgeç yalnız kapatır', () => {
    const onEdit = jest.fn();
    render(<Harness onDelete={jest.fn()} onEdit={onEdit} />);
    expect(screen.getByText('Sil')).toHaveStyle({ color: theme.colors.danger[700] });
    expect(screen.getByText('Düzenle')).toHaveStyle({ color: theme.colors.text.heading });
    expect(screen.getByTestId('act-passive')).toBeDisabled();
    expect(screen.getByText('Vazgeç')).toBeTruthy();
    fireEvent.press(screen.getByTestId('menu-cancel'));
    expect(screen.getByTestId('state').children.join('')).toBe('closed');
    flush();
    expect(onEdit).not.toHaveBeenCalled();
  });
});
