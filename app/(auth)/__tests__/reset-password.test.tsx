/**
 * J46 · Yeni şifre belirle: zayıf şifre validasyonu (tek kaynak `passwordSchema`),
 * yazarken anlık eksik kural ipucu, eşleşmeme (zod refine), eksik token, buton
 * enable/disable, başarı ekranı, sunucu hatası formda kalıcı.
 */
import React from "react";
import { TextInput } from "react-native";
import { screen, fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";

const inputs = () => screen.UNSAFE_getAllByType(TextInput);
const setPasswords = (pw: string, confirm: string) => {
  const [pwInput, confirmInput] = inputs();
  fireEvent.changeText(pwInput, pw);
  fireEvent.changeText(confirmInput, confirm);
};

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, unknown> = { token: "valid-token" };

jest.mock("expo-router", () => ({
  router: {
    replace: (...a: unknown[]) => mockReplace(...a),
    back: (...a: unknown[]) => mockBack(...a),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockLogout = jest.fn((_opts?: unknown) => Promise.resolve());
jest.mock("@/stores/authStore", () => ({
  useAuthStore: (sel?: (state: unknown) => unknown) => {
    const state = { logout: mockLogout };
    return sel ? sel(state) : state;
  },
}));

jest.mock("@/lib/api", () => ({
  authApi: { resetPassword: jest.fn() },
}));
import { authApi } from "@/lib/api";

import ResetPasswordScreen from "../reset-password";

const mockReset = authApi.resetPassword as jest.Mock;

const STRONG = "Abcdef12";

describe("J46 · şifre sıfırlama (zayıf şifre)", () => {
  beforeEach(() => {
    mockReset.mockReset();
    mockReplace.mockClear();
    mockBack.mockClear();
    mockLogout.mockClear();
    mockParams = { token: "valid-token" };
  });

  it("J46.1 her iki alan boşken submit butonu disabled", () => {
    renderWithProviders(<ResetPasswordScreen />);
    expect(screen.getByText("mobile.resetPasswordButton")).toBeDisabled();
  });

  it("J46.2 zayıf şifre (8 karakterden kısa) → hata, istek atılmaz", async () => {
    renderWithProviders(<ResetPasswordScreen />);
    setPasswords("Ab1", "Ab1");
    fireEvent.press(screen.getByText("mobile.resetPasswordButton"));

    await waitFor(() =>
      expect(screen.getByText("auth.pwHintMinLength")).toBeOnTheScreen(),
    );
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("J46.2b ayrı kural kartı yok; yazarken alanın altında yalnız eksik kural", () => {
    renderWithProviders(<ResetPasswordScreen />);
    expect(screen.queryByTestId("password-checklist")).toBeNull();
    expect(screen.queryByText("auth.pwHintNumber")).toBeNull();
    fireEvent.changeText(screen.getByTestId("reset-password-input"), "Abcdefgh");
    expect(screen.getByText("auth.pwHintNumber")).toBeOnTheScreen();
    expect(screen.queryByText("auth.pwHintUppercase")).toBeNull();
    fireEvent.changeText(screen.getByTestId("reset-password-input"), STRONG);
    expect(screen.queryByText("auth.pwHintNumber")).toBeNull();
  });

  it("J46.3 büyük harf eksik → ilgili hata", async () => {
    renderWithProviders(<ResetPasswordScreen />);
    setPasswords("abcdef12", "abcdef12");
    fireEvent.press(screen.getByText("mobile.resetPasswordButton"));

    await waitFor(() =>
      expect(screen.getByText("auth.pwHintUppercase")).toBeOnTheScreen(),
    );
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("J46.4 şifreler eşleşmiyor → hata, istek atılmaz", async () => {
    renderWithProviders(<ResetPasswordScreen />);
    setPasswords(STRONG, "Abcdef99");
    fireEvent.press(screen.getByText("mobile.resetPasswordButton"));

    await waitFor(() =>
      expect(screen.getByText("validation.passwordMatch")).toBeOnTheScreen(),
    );
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("J46.5 eksik token → token hatası, istek atılmaz", async () => {
    mockParams = {};
    renderWithProviders(<ResetPasswordScreen />);
    setPasswords(STRONG, STRONG);
    fireEvent.press(screen.getByText("mobile.resetPasswordButton"));

    await waitFor(() =>
      expect(screen.getByText("auth.resetTokenMissing")).toBeOnTheScreen(),
    );
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("J46.6 güçlü ve eşleşen şifre → resetPassword çağrılır, başarı ekranı", async () => {
    mockReset.mockResolvedValue({});
    renderWithProviders(<ResetPasswordScreen />);
    setPasswords(STRONG, STRONG);
    fireEvent.press(screen.getByText("mobile.resetPasswordButton"));

    await waitFor(() =>
      expect(
        screen.getByText("auth.resetSuccessTitle"),
      ).toBeOnTheScreen(),
    );
    expect(mockReset).toHaveBeenCalledWith("valid-token", STRONG);
  });

  it("J46.7 backend hata mesajı → formda kalıcı gösterilir", async () => {
    mockReset.mockRejectedValue({
      response: { data: { message: "Token süresi doldu" } },
    });
    renderWithProviders(<ResetPasswordScreen />);
    setPasswords(STRONG, STRONG);
    fireEvent.press(screen.getByText("mobile.resetPasswordButton"));

    await waitFor(() =>
      expect(screen.getByText("Token süresi doldu")).toBeOnTheScreen(),
    );
  });

  it("J46.8 success → local session ends (no server calls) before the success view", async () => {
    mockReset.mockResolvedValue({});
    renderWithProviders(<ResetPasswordScreen />);
    setPasswords(STRONG, STRONG);
    fireEvent.press(screen.getByText("mobile.resetPasswordButton"));

    await waitFor(() =>
      expect(screen.getByText("auth.resetSuccessTitle")).toBeOnTheScreen(),
    );
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledWith({ reason: "user", skipServer: true });

    fireEvent.press(screen.getByText("auth.loginTitle"));
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  });

  it("J46.9 success view waits for the logout to finish", async () => {
    let finish!: () => void;
    mockLogout.mockImplementationOnce(() => new Promise<void>((r) => (finish = r)));
    mockReset.mockResolvedValue({});
    renderWithProviders(<ResetPasswordScreen />);
    setPasswords(STRONG, STRONG);
    fireEvent.press(screen.getByText("mobile.resetPasswordButton"));

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(screen.queryByText("auth.resetSuccessTitle")).toBeNull();
    finish();
    await waitFor(() =>
      expect(screen.getByText("auth.resetSuccessTitle")).toBeOnTheScreen(),
    );
  });

  it("J46.10 a failing logout never shows as a failed reset", async () => {
    mockLogout.mockRejectedValueOnce(new Error("storage blocked"));
    mockReset.mockResolvedValue({});
    renderWithProviders(<ResetPasswordScreen />);
    setPasswords(STRONG, STRONG);
    fireEvent.press(screen.getByText("mobile.resetPasswordButton"));

    await waitFor(() =>
      expect(screen.getByText("auth.resetSuccessTitle")).toBeOnTheScreen(),
    );
    expect(screen.queryByText("auth.resetFailed")).toBeNull();
  });

  it("J46.11 failed reset → no logout, form error stays", async () => {
    mockReset.mockRejectedValue({ response: { data: { message: "Token expired" } } });
    renderWithProviders(<ResetPasswordScreen />);
    setPasswords(STRONG, STRONG);
    fireEvent.press(screen.getByText("mobile.resetPasswordButton"));

    await waitFor(() => expect(screen.getByText("Token expired")).toBeOnTheScreen());
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
