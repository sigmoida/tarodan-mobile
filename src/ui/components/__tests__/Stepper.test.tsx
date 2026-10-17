import React from 'react';
import { fireEvent, render, renderHook, act, screen } from '@testing-library/react-native';
import { QuantityStepper, Stepper, useStepper } from '@/ui';

describe('Stepper (web @tarodan/ui)', () => {
  it('tamamlanan ✓, geçerli numara, hata ✕', () => {
    render(<Stepper steps={['Adres', 'Ödeme', { label: 'İptal', error: true }]} current={1} />);
    expect(screen.getByTestId('icon-check')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByTestId('icon-x-mark')).toBeTruthy();
  });

  it('onStepClick yalnız geçmiş/geçerli adımlarda', () => {
    const onStepClick = jest.fn();
    render(<Stepper steps={['A', 'B', 'C']} current={1} onStepClick={onStepClick} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    fireEvent.press(screen.getByText('A'));
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it('useStepper sınırları sıkıştırır', () => {
    const { result } = renderHook(() => useStepper(3));
    act(() => result.current.back());
    expect(result.current.current).toBe(0);
    act(() => result.current.goTo(9));
    expect(result.current.isLast).toBe(true);
  });
});

describe('QuantityStepper (web @tarodan/ui)', () => {
  it('min/max sınırında düğmeler kilitlenir, değer sınır içinde değişir', () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={1} max={2} onChange={onChange} />);
    expect(screen.getByLabelText('Adedi azalt')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Adedi arttır'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('max dolunca + kilitli', () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={2} max={2} onChange={onChange} />);
    expect(screen.getByLabelText('Adedi arttır')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Adedi azalt'));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
