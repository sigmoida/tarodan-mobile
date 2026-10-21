/** `ProductListControls`: the optional "Save this search" icon button (search screen only). */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProductListControls } from '../ProductListControls';

const base = { sortLabel: 'Sort', onSort: jest.fn() };

describe('ProductListControls · save this search', () => {
  it('is not drawn unless onSave is given (other lists stay as they were)', () => {
    render(<ProductListControls {...base} layout="grid" onLayoutChange={jest.fn()} />);
    expect(screen.queryByTestId('save-search-button')).toBeNull();
    expect(screen.getByTestId('layout-toggle')).toBeOnTheScreen();
  });

  it('calls onSave, with the layout toggle still there', () => {
    const onSave = jest.fn();
    render(<ProductListControls {...base} layout="grid" onLayoutChange={jest.fn()} onSave={onSave} />);
    fireEvent.press(screen.getByTestId('save-search-button'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('layout-toggle')).toBeOnTheScreen();
  });

  it('disabled: no call, and the accessibility hint says why', () => {
    const onSave = jest.fn();
    render(<ProductListControls {...base} onSave={onSave} saveDisabled />);
    const button = screen.getByTestId('save-search-button');
    expect(button).toBeDisabled();
    expect(button.props.accessibilityHint).toBe('Kaydetmek için bir arama yapın veya filtre seçin');
    expect(button.props.accessibilityLabel).toBe('Bu aramayı kaydet');
    fireEvent.press(button);
    expect(onSave).not.toHaveBeenCalled();
  });
});
