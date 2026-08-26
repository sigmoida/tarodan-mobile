/**
 * Regression testi — 2FA toggle gerçek durumu SUNUCUDAN okumalı.
 * Bug (düzeltildi): ekran var olmayan user.twoFactorEnabled alanına bakıyordu;
 * artık mockGetTwoFactorStatus() ile TwoFactorSecret.isEnabled'ı çekiyor.
 * Strateji: docs/superpowers/specs/mobile-test-strategy.md
 */
import React from "react";
import { renderWithProviders } from "@/test-utils";
import { render, screen, waitFor } from "@testing-library/react-native";
import SecuritySettingsScreen from "../security";

// expo-router
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

// Oturum açık kullanıcı
jest.mock("@/stores/authStore", () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ isAuthenticated: true, logout: jest.fn() });
    return sel ? sel(state) : state;
  },
}));

// i18n — anahtarı aynen döndür
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// API — mock fn'leri factory İÇİNDE tanımla (out-of-scope ref yok), sonra import et.
jest.mock("@/lib/api", () => ({
  authApi: {
    getTwoFactorStatus: jest.fn(),
    setupTwoFactor: jest.fn(),
    verifyTwoFactor: jest.fn(),
    disableTwoFactor: jest.fn(),
    regenerateBackupCodes: jest.fn(),
    changePassword: jest.fn(),
    logoutAll: jest.fn(),
  },
}));
import { authApi } from "@/lib/api";
const mockGetTwoFactorStatus = authApi.getTwoFactorStatus as jest.Mock;

describe("SecuritySettingsScreen — 2FA durumu", () => {
  beforeEach(() => mockGetTwoFactorStatus.mockReset());

  it('sunucu isEnabled:true dönerse toggle "security.enabled" gösterir', async () => {
    mockGetTwoFactorStatus.mockResolvedValue({ data: { isEnabled: true } });
    renderWithProviders(<SecuritySettingsScreen />);
    await waitFor(() => expect(screen.getByText("security.enabled")).toBeOnTheScreen());
    expect(mockGetTwoFactorStatus).toHaveBeenCalledTimes(1);
  });

  it('sunucu isEnabled:false dönerse toggle "security.disabled" gösterir', async () => {
    mockGetTwoFactorStatus.mockResolvedValue({ data: { isEnabled: false } });
    renderWithProviders(<SecuritySettingsScreen />);
    await waitFor(() =>
      expect(screen.getByText("security.disabled")).toBeOnTheScreen(),
    );
  });
});
