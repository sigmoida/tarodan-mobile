/**
 * J20/J115 · Destek talebi ekranı — mobil UI dilimi.
 * Giriş gerekli durumu + login navigasyonu, kimliği doğrulanmış formda buton
 * disable/enable (kategori+konu+açıklama), iletişim bilgisi render,
 * submit → POST /support/tickets çağrısı.
 */
import React from "react";
import { TextInput } from "react-native";
import { screen, fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";

jest.mock("@/lib/api", () => ({
  supportApi: { createTicket: jest.fn() },
}));
import { supportApi } from "@/lib/api";
const mockCreateTicket = supportApi.createTicket as jest.Mock;

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
import { router } from "expo-router";
const mockPush = router.push as jest.Mock;
const mockBack = router.back as jest.Mock;

let mockAuth: { isAuthenticated: boolean; user: any } = {
  isAuthenticated: true,
  user: { displayName: "Ayşe", email: "ayse@test.com" },
};
jest.mock("@/stores/authStore", () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuth;
    return sel ? sel(state) : state;
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import SupportScreen from "../support/new";

describe("J20 · Destek talebi (support)", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockAuth = {
      isAuthenticated: true,
      user: { displayName: "Ayşe", email: "ayse@test.com" },
    };
  });

  it('J20.1 giriş yapılmamışsa "Giriş Gerekli" + login navigasyonu', () => {
    mockAuth = { isAuthenticated: false, user: null };
    renderWithProviders(<SupportScreen />);
    expect(screen.getByText("auth.loginRequired")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("common.login"));
    expect(mockPush).toHaveBeenCalledWith("/(auth)/login");
  });

  it("J20.2 kimliği doğrulanmış kullanıcıya form ve iletişim bilgisi gösterilir", () => {
    renderWithProviders(<SupportScreen />);
    expect(screen.getByText("support.new.selectCategory")).toBeOnTheScreen();
    expect(screen.getByText("ayse@test.com")).toBeOnTheScreen();
    expect(screen.getByText("Ayşe")).toBeOnTheScreen();
  });

  it('J20.3 zorunlu alanlar boşken "Talep Oluştur" butonu disable', () => {
    renderWithProviders(<SupportScreen />);
    expect(screen.getByText("support.createTicket")).toBeDisabled();
  });

  it("J20.4 kategori+konu+açıklama dolunca buton aktifleşir", () => {
    renderWithProviders(<SupportScreen />);
    // kategori seç
    fireEvent.press(screen.getByText("support.new.category.account"));
    // alanları doldur (Konu, Açıklama) — bu kategoride orderId input'u yok
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], "Hesabıma giremiyorum");
    fireEvent.changeText(inputs[1], "Şifre sıfırlama maili gelmiyor.");
    expect(screen.getByText("support.createTicket")).not.toBeDisabled();
  });

  it("J20.5 submit gerçek API çağrısı yapar (createTicket) ve başarı mesajı gösterir", async () => {
    mockCreateTicket.mockResolvedValueOnce({ data: { ticketNumber: "TKT-1" } });
    renderWithProviders(<SupportScreen />);
    fireEvent.press(screen.getByText("support.new.category.account"));
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], "Hesabıma giremiyorum");
    fireEvent.changeText(inputs[1], "Şifre sıfırlama maili gelmiyor.");
    fireEvent.press(screen.getByText("support.createTicket"));
    await waitFor(() => expect(mockCreateTicket).toHaveBeenCalledTimes(1));
    expect(mockCreateTicket).toHaveBeenCalledWith({
      subject: "Hesabıma giremiyorum",
      category: "account",
      priority: "medium",
      message: "Şifre sıfırlama maili gelmiyor.",
    });
    expect(
      await screen.findByText("support.new.ticketCreated"),
    ).toBeOnTheScreen();
  });

  it("J20.6 API hatasında kullanıcıya hata mesajı gösterilir", async () => {
    mockCreateTicket.mockRejectedValueOnce(new Error("network"));
    renderWithProviders(<SupportScreen />);
    fireEvent.press(screen.getByText("support.new.category.account"));
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], "Hesabıma giremiyorum");
    fireEvent.changeText(inputs[1], "Şifre sıfırlama maili gelmiyor.");
    fireEvent.press(screen.getByText("support.createTicket"));
    expect(
      await screen.findByText("support.new.createFailed"),
    ).toBeOnTheScreen();
  });
});
