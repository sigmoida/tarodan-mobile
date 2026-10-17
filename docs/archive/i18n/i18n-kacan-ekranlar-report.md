# i18n — kaçan ekranlar + paket boyutu etiketi düzeltmesi

Branch: `feat/i18n-kacan-ekranlar` (based on `5a34f6c`).

## Kapsam

Ölçüm scripti yalnız tırnaklı string literal'leri yakalıyordu, `<Text>Merhaba</Text>`
gibi JSX text node'larını değil. Bu tur, önceki on beş dilimin bu kör noktadan
kaçırdığı ekranları kapatıyor (dört dosya hariç — onlar başka bir ajanın
kapsamında: `app/terms.tsx`, `app/intellectual-property.tsx`,
`app/platform-hizmet-bedeli.tsx`, `app/help/_components/HelpFaq.tsx`).

## Çevrilen dosyalar

- `app/settings/liked-collections/index.tsx`
- `src/components/listing/_components/ListingGates.tsx`
- `app/settings/analytics/_components/AnalyticsContent.tsx`
- `app/(auth)/register/index.tsx`
- `app/(auth)/register-business/index.tsx`
- `app/settings/security/_components/SecuritySections.tsx`
- `app/settings/business/_components/BusinessSections.tsx`
- `app/trade/counter/[id]/_components/TradeProductPicker.tsx`
- `app/trade/[id]/_components/TradeProtectionCard.tsx`
- `app/checkout/_components/CheckoutSteps.tsx`
- `app/(auth)/corporate-invite/index.tsx`
- `app/(auth)/login/index.tsx`
- `app/collections/_components/CollectionsInfoCard.tsx`
- `app/membership/index.tsx`
- `src/components/AnimatedSplash.tsx`

Ölçüm scripti tek-satır JSX text node'larını yakalıyor; çok-satırlı JSX text
node'ları (`>\n  metin\n<`) onun da kör noktası. Aynı dosyaları düzenlerken
göze çarpan böyle birkaç ek string de (SecuritySections'taki 2FA açıklaması,
TradeProtectionCard'ın alt metni, corporate-invite'taki iki ek string, login'in
"İşletme sahibi misiniz?" satırı) aynı geçişte katalogtan okunur hale getirildi.

## Reuse — mevcut anahtar kullanımı

Yaklaşık 6800 anahtarlık katalogda karşılığı olan ~20 string doğrudan
yeniden kullanıldı (`common.login`, `common.loading`, `common.back`,
`common.goBack`, `common.error`, `auth.hasAccount`, `auth.signUp`,
`auth.noAccount`, `auth.registerSubmit`, `collection.authGateTitle`,
`collection.exploreCollections`, `collection.noLikedCollections`,
`collection.becomePremiumCta`, `collection.tryAgain`,
`product.loginRequiredToCreate`, `product.listingNotFound`,
`product.editListing`, `security.phoneVerificationTitle`,
`mobile.settingsBusinessPanel`, `analytics.revenueTracking`, vb).

**Reuse'un yol açtığı görünür metin değişiklikleri:**
- Liked-collections hata başlığı "Bir Hata Oluştu" → "Hata" (`common.error`).
- Liked-collections boş-durum başlığı "Henüz Beğeni Yok" →
  "Henüz beğendiğiniz koleksiyon yok" (`collection.noLikedCollections`).
- Analytics premium-upsell madde "Gelir takibi" → "Gelir Takibi"
  (`analytics.revenueTracking`, büyük harf farkı).
- Login footer "Girişe dön" (corporate-invite) zaten kullanılmayan bir
  `auth.backToLogin` anahtarına birebir denk düştüğü için o anahtar kullanıldı
  (önceki değeri "Girişe Dön" idi, hiçbir ekranda kullanılmıyordu — case
  ekrandaki gerçek metne göre düzeltildi, başka kullanıcı yok).

## Yeni eklenen anahtarlar

Reuse'un karşılamadığı ~30 string için yeni anahtar eklendi (`collection.likedLoginSubtitle`,
`collection.likedLoadErrorDesc`, `collection.likedEmptySubtitle`,
`listing.reservedCannotEdit`, `analytics.totalViewsCount` (ICU `{count}`),
`analytics.daysUnit` (ICU `{count}`), `analytics.premiumUpsellDesc`,
`analytics.featureConversionRates`, `analytics.featureTradeSuccessRates`,
`analytics.featureTopPerformingListings`, `analytics.featureCollectionEngagement`,
`auth.registerBusinessTitle`, `auth.isBusinessOwnerPrompt`,
`auth.openBusinessAccountCta`, `auth.corporateInviteInvalidDesc`,
`auth.corporateActivateSubmit`, `security.twoFactorDesc`,
`trade.noEligibleProducts`, `trade.protectionProgramTitle`,
`trade.protectionProgramDesc`, `checkout.suratKargoDeliveryEstimate`,
`collection.digitalGarageWhatTitle`, `collection.digitalGarageInfoDesc`,
`mobile.splashTagline`, `listing.packageTierSmall/Medium/Large`).

## Kullanıcıya görünmeyen/bilinçli olarak dokunulmayan stringler

- `app/checkout/_lib/constants.ts` ("satışta değil", "başka alıcıya satıldı") —
  backend hata mesajı içinde geçen anahtar kelimeler; sunucu yanıt metniyle
  eşleştirme için kullanılıyor, ekranda render edilmiyor.
- `app/trade/new/_hooks/useNewTrade.ts` ("Takas özelliği") — backend hata
  mesajı anahtar kelimesi (`msg.includes('Takas özelliği')`), aynı sebep.
- `app/settings/business/index.tsx` ("şirket adı") — backend hata mesajı
  anahtar kelimesi (`f.error.includes('şirket adı')`), aynı sebep.
- `app/(auth)/login/_hooks/useLogin.ts` ("doğrula") — backend hata mesajı
  anahtar kelimesi (doğrulanmamış e-posta banner'ını tetiklemek için), aynı
  sebep.
- `app/membership/checkout/_hooks/useMembershipCheckout.ts` —
  `throw new Error('Ödeme başlatılamadı (paymentId alınamadı).')` yalnızca
  `captureException` (Sentry) ile raporlanıyor; kullanıcıya gösterilen
  `appAlert` metni `e?.response?.data?.message || t('membership.paymentErrorGeneric')`
  kullanıyor — bu senkron hata nesnesinin `.response` alanı olmadığından
  kullanıcı her zaman çevrilmiş `membership.paymentErrorGeneric` metnini görüyor.
  Doğrulandı: `e.message` hiçbir gözün önüne düşmüyor.
- "Sürat Kargo" — `app/trade/[id]/_components/TradeShippingSection.tsx`,
  `app/sales/[id]/_components/SaleDetailBody.tsx`,
  `app/order-track/_components/OrderTrackResult.tsx` — taşıyıcı marka adı,
  özel ad, çevrilmez (CLAUDE.md kural 4, diğer geçişlerle tutarlı).
- `TradeShippingSection.tsx` içindeki "tutarlılık" — kod yorumunda geçiyor
  (`{/* ... "tutarlılık" adına kaldırmayın */}`), kullanıcıya hiç render
  edilmiyor.

## Part 2 — kargo paket boyutu etiketleri

`GET /shipping/package-tiers` yanıtındaki `label` alanı sunucudan Türkçe ve
bugün yazım hatalı geliyor ("Kucuk Paket", "Buyuk Paket" — ü/ı eksik).
`src/components/listing/_lib/constants.ts`'e `getPackageTierLabel(code,
fallbackLabel, t)` eklendi: `code` ('small'/'medium'/'large') katalog
anahtarına eşleniyor (`listing.packageTierSmall/Medium/Large`); tanınmayan bir
`code` gelirse (yeni bir kademe) sunucunun `label`'ına düşülüyor, hiç metin
göstermemek yerine. `src/components/listing/_components/ListingSections.tsx`
`{tier.label}` yerine `{getPackageTierLabel(tier.code, tier.label, t)}`
kullanıyor artık. Forma ne gönderildiği DEĞİŞMEDİ — `code` hâlâ sunucuya giden
değer, yalnız görünen etiket katalogdan geliyor.

Yeni test: `src/components/listing/_lib/__tests__/packageTierLabel.test.ts` —
`small` kodu, sunucudan yazım hatalı "Kucuk Paket" gelse bile, TR'de
"Küçük Paket", EN'de "Small Package" render ediyor; `medium`/`large` de
katalogtan geliyor; tanınmayan bir kod sunucu etiketine düşüyor. Mevcut
`src/components/listing/__tests__/packageTier.test.tsx` testi (doğru yazılmış
mock etiketlerle) değişiklik gerektirmeden yeşil kaldı.

## Doğrulama

- `npx tsc --noEmit` — temiz.
- `npx eslint . --ext .ts,.tsx` — 0 hata, 1103 uyarı (temel çizgi ~1106).
- `npx jest --testTimeout=45000` — dokunulan tüm dosyaların testleri + yeni
  test dahil yeşil (tam koşu sonucu commit mesajında).
- `node scripts/gen-keys.mjs` her anahtar eklemesinden sonra çalıştırıldı.
- Ölçüm scripti yeniden çalıştırıldı: hedef dosyaların tamamı temiz; kalan
  tüm satırlar ya başka ajanın kapsamındaki 4 dosya, ya "Sürat Kargo" özel
  adı, ya backend hata-mesajı anahtar kelimesi eşleştirmesi, ya da kod yorumu
  (yukarıda tek tek listelendi).
