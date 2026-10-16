import React from 'react';
import { act, render } from '@testing-library/react-native';
import {
  isModalPresent,
  resetModalPresenceForTests,
  subscribeModalPresence,
  useModalPresence,
} from '../modalPresence';
import { MODAL_CLOSE_DELAY_MS } from '../modal-timing';

function Probe({ open }: { open: boolean }) {
  useModalPresence(open);
  return null;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetModalPresenceForTests();
});
afterEach(() => jest.useRealTimers());

describe('modalPresence', () => {
  it('açıkken kayıtlı; kapanınca MODAL_CLOSE_DELAY_MS sonra düşer ve abonelere bildirilir', () => {
    const changed = jest.fn();
    subscribeModalPresence(changed);
    const view = render(<Probe open />);
    expect(isModalPresent()).toBe(true);
    view.rerender(<Probe open={false} />);
    expect(isModalPresent()).toBe(true); // kapanış penceresi
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(isModalPresent()).toBe(false);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('doğrudan sökülürse de kayıt gecikmeyle düşer (sızmaz)', () => {
    const view = render(<Probe open />);
    view.unmount();
    expect(isModalPresent()).toBe(true);
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(isModalPresent()).toBe(false);
  });

  it('birden çok modal: sayaçlı', () => {
    render(
      <>
        <Probe open />
        <Probe open />
      </>,
    );
    expect(isModalPresent()).toBe(true);
  });
});
