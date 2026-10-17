/**
 * İlan eylem menüsü `ActionSheet`: satır eylemleri sheet kapandıktan SONRA çalışır (kaldırma
 * penceresi / öne çıkar / kota uyarısı için zamanlayıcı hack'i yok); menü kapanırken ilan
 * durur (satırlar kaybolmaz); sil yıkıcı.
 */
import React, { useState } from 'react';
import { Modal } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({ ...jest.requireActual('@/lib/purchases'), CAN_BUY_DIGITAL: true }));
jest.mock('@/components/listing/ListingRemovalModal', () => ({ ListingRemovalModal: () => null }));

import { MyListingsModals } from '../MyListingsModals';
import type { Listing } from '../../_lib/types';

const listing = (over: Partial<Listing> = {}): Listing => ({
  id: 'l1',
  title: 'Ferrari F40',
  price: 100,
  status: 'active',
  viewCount: 0,
  images: [],
  createdAt: '',
  updatedAt: '',
  condition: 'new',
  ...over,
});

function Harness({ l, onAction }: { l: Listing; onAction: jest.Mock }) {
  const [open, setOpen] = useState(true);
  const f: any = {
    actionMenuListing: l,
    actionMenuOpen: open,
    closeActionMenu: () => setOpen(false),
    handleMenuAction: onAction,
    removalTarget: null,
    removalOpen: false,
    closeRemoval: jest.fn(),
    submitRemoval: jest.fn(),
  };
  return <MyListingsModals f={f} />;
}

const nativeDismiss = () =>
  act(() => {
    screen.UNSAFE_getByType(Modal).props.onDismiss?.();
  });

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe('MyListingsModals — eylem menüsü', () => {
  it('aktif ilan satırları; sil kırmızı (yıkıcı) ve son', () => {
    render(<Harness l={listing()} onAction={jest.fn()} />);
    for (const k of ['view', 'edit', 'boost', 'deactivate', 'delete']) {
      expect(screen.getByTestId(`listing-menu-${k}`)).toBeOnTheScreen();
    }
    expect(screen.queryByTestId('listing-menu-relist')).toBeNull();
    expect(screen.getByTestId('listing-menu-sheet-cancel')).toBeOnTheScreen();
  });

  it('satıra basınca menü kapanır, eylem native kapanıştan SONRA (ilanla) çalışır', () => {
    const onAction = jest.fn();
    const l = listing();
    render(<Harness l={l} onAction={onAction} />);
    fireEvent.press(screen.getByTestId('listing-menu-delete'));
    expect(onAction).not.toHaveBeenCalled();
    nativeDismiss();
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('delete', l);
  });

  it('Vazgeç eylem çalıştırmaz', () => {
    const onAction = jest.fn();
    render(<Harness l={listing()} onAction={onAction} />);
    fireEvent.press(screen.getByTestId('listing-menu-sheet-cancel'));
    nativeDismiss();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('pasif ilan: yeniden yayınla satırı', () => {
    render(<Harness l={listing({ status: 'inactive' })} onAction={jest.fn()} />);
    expect(screen.getByTestId('listing-menu-relist')).toBeOnTheScreen();
    expect(screen.queryByTestId('listing-menu-deactivate')).toBeNull();
  });
});
