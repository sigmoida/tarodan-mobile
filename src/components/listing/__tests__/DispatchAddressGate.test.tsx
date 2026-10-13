/**
 * Kargo çıkış adresi kapısı (C3 inceleme 1, web `AddressGate` + `canCreateListing`):
 * yeni ilan formu adres geçerli olana kadar GÖSTERİLMEZ. Bilinmeyen durum
 * (yükleniyor/hata) "adres ekle" demez: loader / ErrorState + yeniden dene.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

import { DispatchAddressGate, dispatchGateBlocks } from '../_components/DispatchAddressGate';

function ctrl(over: Record<string, unknown> = {}): any {
  return {
    isEdit: false,
    hasDispatchAddress: false,
    dispatchAddressNeedsFix: false,
    dispatchAddressLoading: false,
    dispatchAddressError: false,
    refetchDispatchAddress: jest.fn(),
    ...over,
  };
}

describe('DispatchAddressGate', () => {
  beforeEach(() => (router.push as jest.Mock).mockClear());

  it('kapıyı yalnız yeni ilanda ve adres geçersizken kapatır', () => {
    expect(dispatchGateBlocks(ctrl())).toBe(true);
    expect(dispatchGateBlocks(ctrl({ hasDispatchAddress: true }))).toBe(false);
    expect(dispatchGateBlocks(ctrl({ isEdit: true }))).toBe(false);
  });

  it('adres geçerliyse hiçbir şey çizmez', () => {
    render(<DispatchAddressGate f={ctrl({ hasDispatchAddress: true })} />);
    expect(screen.toJSON()).toBeNull();
  });

  it('yüklenirken "adres ekle" istemi YOK', () => {
    render(<DispatchAddressGate f={ctrl({ dispatchAddressLoading: true })} />);
    expect(screen.queryByText('Adres Ekle')).toBeNull();
    expect(screen.queryByText('İlan vermeden önce kargo çıkış adresi eklemelisiniz')).toBeNull();
  });

  it('hata varsa ErrorState + yeniden dene; "adres ekle" istemi YOK', () => {
    const refetch = jest.fn();
    render(<DispatchAddressGate f={ctrl({ dispatchAddressError: true, refetchDispatchAddress: refetch })} />);
    expect(screen.queryByText('Adres Ekle')).toBeNull();
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('adres yoksa ekleme istemi, Adreslerim e götürür', () => {
    render(<DispatchAddressGate f={ctrl()} />);
    expect(screen.getByText('İlan vermeden önce kargo çıkış adresi eklemelisiniz')).toBeTruthy();
    fireEvent.press(screen.getByText('Adres Ekle'));
    expect(router.push).toHaveBeenCalledWith('/settings/addresses');
  });

  it('kayıt kullanılamazsa "düzelt" denir', () => {
    render(<DispatchAddressGate f={ctrl({ dispatchAddressNeedsFix: true })} />);
    expect(screen.getByText('Kargo çıkış adresinizi düzeltmelisiniz')).toBeTruthy();
    expect(screen.getByText('Adresi Düzenle')).toBeTruthy();
  });
});
