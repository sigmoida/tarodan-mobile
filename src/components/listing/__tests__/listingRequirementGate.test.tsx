/**
 * Yeni ilan ön koşul kapısı (web `BankGate` + `AddressGate`): IBAN ve kargo çıkış adresi
 * TEK bileşen altında. İkisi birlikte yüklenir ya da hata verirse TEK loader / TEK
 * ErrorState görünür; "Tekrar Dene" hatalı her sorguyu birlikte yeniden çeker. Bilinmeyen
 * durum (yükleniyor / hata) "ekle" demez.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

import { ListingRequirementGate } from '../_components/ListingRequirementGate';
import { listingGateView, listingGatesBlock, bankGateState, dispatchGateState } from '../_lib/gates';

/** Varsayılan: ikisi de AÇIK (hesap var, adres geçerli). */
function ctrl(over: Record<string, unknown> = {}): any {
  return {
    isEdit: false,
    hasBankAccount: true,
    bankAccountLoading: false,
    bankAccountError: false,
    refetchBankAccount: jest.fn(),
    hasDispatchAddress: true,
    dispatchAddressNeedsFix: false,
    dispatchAddressLoading: false,
    dispatchAddressError: false,
    refetchDispatchAddress: jest.fn(),
    ...over,
  };
}

const BANK_MISSING = { hasBankAccount: false };
const BANK_LOADING = { hasBankAccount: false, bankAccountLoading: true };
const BANK_ERROR = { hasBankAccount: false, bankAccountError: true };
const ADDR_MISSING = { hasDispatchAddress: false };
const ADDR_LOADING = { hasDispatchAddress: false, dispatchAddressLoading: true };
const ADDR_ERROR = { hasDispatchAddress: false, dispatchAddressError: true };

const BANK_PROMPT = 'İlan vermeden önce banka hesabı ekleyin';
const ADDR_PROMPT = 'İlan vermeden önce kargo çıkış adresi eklemelisiniz';

beforeEach(() => (router.push as jest.Mock).mockClear());

describe('gates: durum ve birleşik görünüm', () => {
  it('tek tek durumlar', () => {
    expect(bankGateState(ctrl())).toBe('open');
    expect(bankGateState(ctrl(BANK_LOADING))).toBe('loading');
    expect(bankGateState(ctrl(BANK_ERROR))).toBe('error');
    expect(bankGateState(ctrl(BANK_MISSING))).toBe('missing');
    expect(dispatchGateState(ctrl(ADDR_LOADING))).toBe('loading');
    expect(dispatchGateState(ctrl(ADDR_ERROR))).toBe('error');
    expect(dispatchGateState(ctrl(ADDR_MISSING))).toBe('missing');
  });

  it('düzenlemede ikisi de açık', () => {
    const f = ctrl({ isEdit: true, ...BANK_MISSING, ...ADDR_MISSING });
    expect(listingGateView(f).view).toBe('open');
    expect(listingGatesBlock(f)).toBe(false);
  });

  it.each([
    ['ikisi açık', {}, 'open'],
    ['ikisi yükleniyor', { ...BANK_LOADING, ...ADDR_LOADING }, 'loading'],
    ['biri yükleniyor, diğeri açık', BANK_LOADING, 'loading'],
    ['ikisi hata', { ...BANK_ERROR, ...ADDR_ERROR }, 'error'],
    ['hata + yükleniyor -> hata önce', { ...BANK_ERROR, ...ADDR_LOADING }, 'error'],
    ['yükleniyor + bilinen eksik -> bilinmeyen önce', { ...BANK_LOADING, ...ADDR_MISSING }, 'loading'],
    ['ikisi bilinen eksik', { ...BANK_MISSING, ...ADDR_MISSING }, 'prompts'],
    ['biri bilinen eksik', ADDR_MISSING, 'prompts'],
  ])('%s -> %s', (_n, over, expected) => {
    expect(listingGateView(ctrl(over)).view).toBe(expected);
  });
});

describe('ListingRequirementGate', () => {
  it('ikisi açıksa hiçbir şey çizmez', () => {
    render(<ListingRequirementGate f={ctrl()} />);
    expect(screen.toJSON()).toBeNull();
  });

  it('ikisi birlikte yüklenirken TEK loader ve hiçbir istem', () => {
    const { UNSAFE_getAllByType } = render(<ListingRequirementGate f={ctrl({ ...BANK_LOADING, ...ADDR_LOADING })} />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(1);
    expect(screen.queryByText('IBAN Ekle')).toBeNull();
    expect(screen.queryByText('Adres Ekle')).toBeNull();
  });

  it('ikisi birlikte hata verirse TEK ErrorState; Tekrar Dene ikisini de çeker', () => {
    const refetchBank = jest.fn();
    const refetchAddr = jest.fn();
    render(
      <ListingRequirementGate
        f={ctrl({ ...BANK_ERROR, ...ADDR_ERROR, refetchBankAccount: refetchBank, refetchDispatchAddress: refetchAddr })}
      />,
    );
    expect(screen.getAllByText('Tekrar Dene')).toHaveLength(1);
    expect(screen.queryByText('IBAN Ekle')).toBeNull();
    expect(screen.queryByText('Adres Ekle')).toBeNull();
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(refetchBank).toHaveBeenCalledTimes(1);
    expect(refetchAddr).toHaveBeenCalledTimes(1);
  });

  it('yalnız biri hata verirse yalnız o sorgu yeniden çekilir', () => {
    const refetchBank = jest.fn();
    const refetchAddr = jest.fn();
    render(
      <ListingRequirementGate f={ctrl({ ...BANK_ERROR, refetchBankAccount: refetchBank, refetchDispatchAddress: refetchAddr })} />,
    );
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(refetchBank).toHaveBeenCalledTimes(1);
    expect(refetchAddr).not.toHaveBeenCalled();
  });

  it('IBAN yok: IBAN istemi, Banka Hesabım a götürür', () => {
    render(<ListingRequirementGate f={ctrl(BANK_MISSING)} />);
    expect(screen.getByText(BANK_PROMPT)).toBeTruthy();
    expect(screen.queryByText(ADDR_PROMPT)).toBeNull();
    fireEvent.press(screen.getByText('IBAN Ekle'));
    expect(router.push).toHaveBeenCalledWith('/settings/bank-account');
  });

  it('adres yok: adres istemi, Adreslerim e götürür', () => {
    render(<ListingRequirementGate f={ctrl(ADDR_MISSING)} />);
    expect(screen.getByText(ADDR_PROMPT)).toBeTruthy();
    expect(screen.queryByText(BANK_PROMPT)).toBeNull();
    fireEvent.press(screen.getByText('Adres Ekle'));
    expect(router.push).toHaveBeenCalledWith('/settings/addresses');
  });

  it('ikisi de yok: iki istem alt alta', () => {
    render(<ListingRequirementGate f={ctrl({ ...BANK_MISSING, ...ADDR_MISSING })} />);
    expect(screen.getByText(BANK_PROMPT)).toBeTruthy();
    expect(screen.getByText(ADDR_PROMPT)).toBeTruthy();
  });

  it('adres kullanılamıyorsa "düzelt" denir', () => {
    render(<ListingRequirementGate f={ctrl({ ...ADDR_MISSING, dispatchAddressNeedsFix: true })} />);
    expect(screen.getByText('Kargo çıkış adresinizi düzeltmelisiniz')).toBeTruthy();
    expect(screen.getByText('Adresi Düzenle')).toBeTruthy();
  });
});
