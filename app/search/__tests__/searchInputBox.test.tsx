import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { SearchInputBox } from '../_components/SearchInputBox';

const baseProps = () => ({
  initialValue: '',
  command: null as { text: string; nonce: number } | null,
  autoFocus: false,
  suggestionsOpen: false,
  onCommit: jest.fn(),
  onEmptyChange: jest.fn(),
  onSubmit: jest.fn(),
  onClose: jest.fn(),
  onFocus: jest.fn(),
  onBlur: jest.fn(),
});

describe('SearchInputBox', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('yazarken yerel state değişir, onCommit yalnız 400ms sonra son metinle çağrılır', () => {
    const props = baseProps();
    renderWithProviders(<SearchInputBox {...props} />);
    const input = screen.getByTestId('search-input');

    fireEvent.changeText(input, 'fer');
    fireEvent.changeText(input, 'ferrari');
    expect(screen.getByTestId('search-input').props.value).toBe('ferrari');

    props.onCommit.mockClear();
    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(props.onCommit).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(props.onCommit).toHaveBeenCalledTimes(1);
    expect(props.onCommit).toHaveBeenCalledWith('ferrari');
  });

  it('dışarıdan gelen komut kutuyu doldurur ve boş durumunu bildirir', () => {
    const props = baseProps();
    const { rerender } = renderWithProviders(<SearchInputBox {...props} />);
    expect(props.onEmptyChange).toHaveBeenLastCalledWith(true);

    rerender(<SearchInputBox {...props} command={{ text: 'porsche', nonce: 1 }} />);
    expect(screen.getByTestId('search-input').props.value).toBe('porsche');
    expect(props.onEmptyChange).toHaveBeenLastCalledWith(false);

    rerender(<SearchInputBox {...props} command={{ text: '', nonce: 2 }} />);
    expect(screen.getByTestId('search-input').props.value).toBe('');
    expect(props.onEmptyChange).toHaveBeenLastCalledWith(true);
  });

  it('klavyede arama (Enter) onSubmit ile güncel metni bildirir', () => {
    const props = baseProps();
    renderWithProviders(<SearchInputBox {...props} />);
    const input = screen.getByTestId('search-input');
    fireEvent.changeText(input, 'ferrari');
    fireEvent(input, 'submitEditing');
    expect(props.onSubmit).toHaveBeenCalledWith('ferrari');
  });
});
