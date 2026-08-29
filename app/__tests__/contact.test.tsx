/**
 * J116 · İletişim ekranı — mobil UI dilimi.
 * Boş/kısa mesaj reddi (snackbar validasyonu), geçerli form gönderiminde
 * guestContact çağrısı + başarı snackbar, FAQ navigasyonu.
 * Backend mesaj işleme/e-posta backend-only.
 */
import React from "react";
import { TextInput } from "react-native";
import { screen, fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
import { router } from "expo-router";
const mockPush = router.push as jest.Mock;

jest.mock("@/lib/api", () => ({
  supportApi: { guestContact: jest.fn() },
}));
import { supportApi } from "@/lib/api";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import ContactScreen from "../contact";

const guestContactMock = supportApi.guestContact as jest.Mock;

/** Form input'larını sırasıyla doldurur: Adınız, E-posta, Konu, Mesajınız. */
function fillForm(values: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const inputs = screen.UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(inputs[0], values.name);
  fireEvent.changeText(inputs[1], values.email);
  fireEvent.changeText(inputs[2], values.subject);
  fireEvent.changeText(inputs[3], values.message);
}

describe("J116 · İletişim (contact)", () => {
  beforeEach(() => {
    guestContactMock.mockReset();
    mockPush.mockReset();
  });

  it("J116.1 boş form gönderiminde uyarı snackbar gösterilir, API çağrılmaz", async () => {
    renderWithProviders(<ContactScreen />);
    fireEvent.press(screen.getByText("common.send"));
    expect(
      await screen.findByText("common.fillAllFields"),
    ).toBeOnTheScreen();
    expect(guestContactMock).not.toHaveBeenCalled();
  });

  it("J116.2 mesaj 10 karakterden kısa → reddedilir", async () => {
    renderWithProviders(<ContactScreen />);
    fillForm({
      name: "Ali",
      email: "ali@test.com",
      subject: "Soru",
      message: "kısa",
    });
    fireEvent.press(screen.getByText("common.send"));
    expect(
      await screen.findByText("contact.messageTooShort"),
    ).toBeOnTheScreen();
    expect(guestContactMock).not.toHaveBeenCalled();
  });

  it("J116.3 geçersiz e-posta → reddedilir", async () => {
    renderWithProviders(<ContactScreen />);
    fillForm({
      name: "Ali",
      email: "gecersiz",
      subject: "Soru",
      message: "Bu yeterince uzun bir mesaj.",
    });
    fireEvent.press(screen.getByText("common.send"));
    expect(
      await screen.findByText("validation.invalidEmail"),
    ).toBeOnTheScreen();
    expect(guestContactMock).not.toHaveBeenCalled();
  });

  it("J116.4 geçerli form → guestContact çağrılır ve başarı snackbar", async () => {
    guestContactMock.mockResolvedValue({});
    renderWithProviders(<ContactScreen />);
    fillForm({
      name: "Ali Veli",
      email: "ali@test.com",
      subject: "Soru",
      message: "Bu yeterince uzun bir mesaj.",
    });
    fireEvent.press(screen.getByText("common.send"));
    await waitFor(() =>
      expect(guestContactMock).toHaveBeenCalledWith({
        name: "Ali Veli",
        email: "ali@test.com",
        subject: "Soru",
        message: "Bu yeterince uzun bir mesaj.",
      }),
    );
    expect(await screen.findByText("contact.success")).toBeOnTheScreen();
  });

  it("J116.5 SSS bağlantısı /help ekranına yönlendirir", () => {
    renderWithProviders(<ContactScreen />);
    fireEvent.press(screen.getByText("faq.title"));
    expect(mockPush).toHaveBeenCalledWith("/help");
  });
});
