/**
 * J126 · Statik bilgi sayfaları (about / faq / guides) — mobil UI dilimi.
 * Başlık + içerik görünür, FAQ/Guides accordion içeriği genişletilince görünür.
 * Bu ekranlar tamamen statik (API yok); slug-bazlı "bulunamadı" durumu page/[slug] testinde.
 */
import React from "react";
import { screen, fireEvent } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: { Screen: () => null },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import AboutScreen from "../about";
import FAQScreen from "../faq";
import GuidesScreen from "../guides";

describe("J126 · Hakkımızda (about) render", () => {
  it("J126.4 başlık ve içerik bölümleri görünür", () => {
    renderWithProviders(<AboutScreen />);
    expect(screen.getByText("Tarodan")).toBeOnTheScreen();
    expect(screen.getByText("Hikayemiz")).toBeOnTheScreen();
    expect(screen.getByText("Misyon")).toBeOnTheScreen();
    expect(screen.getByText("Değerlerimiz")).toBeOnTheScreen();
  });
});

describe("J126 · SSS (faq) render", () => {
  it("J126.5 kategoriler ve sorular render edilir", () => {
    renderWithProviders(<FAQScreen />);
    expect(screen.getByText("faq.buying")).toBeOnTheScreen();
    expect(screen.getByText("faqPage.buying.howToOrder.q")).toBeOnTheScreen();
  });

  it("J126.6 soruya dokununca cevap genişler", () => {
    renderWithProviders(<FAQScreen />);
    // Başlangıçta hiçbiri açık değil → cevap görünmez
    const answer = "faqPage.buying.howToOrder.a";
    expect(screen.queryByText(answer)).toBeNull();
    fireEvent.press(screen.getByText("faqPage.buying.howToOrder.q"));
    expect(screen.getByText(answer)).toBeOnTheScreen();
  });
});

describe("J126 · Rehberler (guides) render", () => {
  it("J126.7 rehber başlıkları görünür; ilk rehber varsayılan açık", () => {
    renderWithProviders(<GuidesScreen />);
    expect(screen.getByText("guides.howToBuy.title")).toBeOnTheScreen();
    expect(screen.getByText("guides.howToSell.title")).toBeOnTheScreen();
    // expandedIndex=0 başlangıç → ilk rehberin adımı görünür
    expect(screen.getByText("guides.howToBuy.step1")).toBeOnTheScreen();
  });
});
