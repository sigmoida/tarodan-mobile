# Tarodan Mobil — Yol Haritası (2026-08-01)

Sıralama **fiyat/performans**: kritiklik × efor. Üstteki işler az emekle çok kazandırır.

Kaynaklar: `docs/superpowers/reports/2026-08-01-layout-denetimi.md` (10 bulgu),
2026-08-01 parite denetimi, Plan 3 final incelemesi, `specs/2026-07-31-ios-prod-release-hatti-design.md` §9.

---

## Faz 0 — Şu an kırık olanlar (ACİL, hepsi kısa)

Bunlar "geliştirme" değil, **arıza**. Sıranın en başında olmalarının sebebi bu.

### 0.1 `via.placeholder.com` ölü — uygulamadaki tüm yedek görseller kırık ⚡

**En yüksek fiyat/performans işi.** 15 dakika, üç satır.

2026-08-01'de doğrulandı: DNS çözülüyor ama SSL bağlantısı düşüyor (`curl` → `SSL_ERROR_SYSCALL`, HTTP 000).
Servis üçüncü partiye ait ve geri geleceğinin garantisi yok.

| Konum | Etki |
|---|---|
| `src/utils/orderProductImage.ts:11` | **Görseli olmayan HER ürün** — sipariş kartları, satış kartları, her yerde |
| `app/(tabs)/_components/HomeSections.tsx:62` | Ana sayfa tanıtım görseli |
| `app/settings/liked-collections/_hooks/useLikedCollections.ts:62` | Beğenilen koleksiyonlar |

**Düzeltme:** yerel bir asset (`assets/` altına placeholder ekle) veya `AppImage`'ın
kendi boş-durum çizimi. Dış servise bağımlılık tamamen kalksın.
**Not:** Layout raporu B9 bunu "Düşük" diye işaretledi — yalnız *kayma* açısından
doğru. Üretim açısından Yüksek.

### 0.2 Production API ayakta değil — **SENDE**

`tarodan.com.tr/api/*` → 500. Gerçek yayının önkoşulu. Bu olmadan prod build'i
TestFlight'a göndermek uygulamayı tamamen ölü gösterir.

### 0.3 Cihazındaki staging build'i güncelle — **SENDE**

Build 8 (27 Tem) ölü `api.staging.tarodan.shop` domainine bakıyor. Build 11
TestFlight'ta hazır ve doğru adresi taşıyor. Kurmadan hiçbir yeni işi göremezsin.

---

## Faz 1 — Layout: ucuz ve çok görünür (tek oturum)

Layout raporunun kendi önerdiği sıra, fiyat/performansa göre yeniden dizildi.

| # | İş | Bulgu | Efor | Neden burada |
|---|---|---|---|---|
| 1.1 | Safe-area: sabit `50` → `insets.top` (8 konum) + üst boşluğu hiç olmayan 2 ekran | B5, B4 | S | Mekanik, düşük riskli. Dynamic Island'lı telefonlarda header saate değiyor — en görünür kalite sıçraması |
| 1.2 | `AdBanner` veri gelmeden yer ayırsın (`return null` yerine sabit yükseklik) | B1 | S | Tek dosya, tek koşul. Ana sayfanın en can sıkıcı zıplamasını götürür |
| 1.3 | "Popüler İlanlar" rafına `minHeight` | B2 | S | Tek section + stylesheet |
| 1.4 | Sipariş detayında fatura kartlarını aşağı taşı | B7 | S | Kart sırası değişikliği |

**Doğrulama:** her madde sonrası `tsc` + `lint` + `jest`; Faz 1 sonunda Metro'da
gerçek cihazda gözle kontrol (bunlar görsel işler, test kanıtlamaz).

---

## Faz 2 — Layout: davranışsal, elle test şart

| # | İş | Bulgu | Efor | Risk |
|---|---|---|---|---|
| 2.1 | Mesaj ekranı `scrollToEnd` koşullandırması (yalnız kullanıcı zaten dipteyse) | B3 | M | Davranışsal — yanlış yapılırsa yeni mesaj görünmez |
| 2.2 | `FlatList`'lere `getItemLayout` (sabit yükseklikli listelerde) | B8 | M | Ölçü yanlışsa scroll bozulur |
| 2.3 | Arama header yüksekliği / collapse mantığı | B6 | M | **En riskli** — `useSearch` scroll mantığına dokunuyor, sona bırak |
| 2.4 | Kart genişliği modül yüklenirken bir kez hesaplanıyor (döndürme/split view) | B10 | S | Düşük etki |

**Not:** B3'ün TypingIndicator kaynaklı tetikleyicisi Plan 3'te zaten kapatıldı;
kalan iki tetikleyici (görsel yüklenmesi, sayfa yüklenmesi) bu maddede.

---

## Faz 3 — Büyük işler (her biri kendi planını hak ediyor)

| # | İş | Efor | Not |
|---|---|---|---|
| 3.1 | **i18n taşıma** — tek kalan P2 kalemi | L | `useTranslation` kullanan 64 dosya, `app/` altında 332 tsx → ~%19. Kalan ~%81 mekanik ama büyük. **Dilim dilim yapılmalı**, tek oturuma sıkıştırılırsa yarısı çevrilmiş tutarsız arayüz kalır |
| 3.2 | **Android yayın hattı** | M | Plan hazır (`specs/…-ios-prod-release-hatti-design.md` §7). **Önkoşullar sende:** Play Console uygulaması, service account JSON (`eas credentials` ile, repoya KONMAZ), Firebase'e `com.tarodan.app.staging` kaydı + `google-services.json`'ın YENİDEN indirilmesi (tek client'lı dosya staging build'ini keser) |

---

## Faz 4 — Ops / kararlar (SENDE veya onayın gerekli)

| # | İş | Kim |
|---|---|---|
| 4.1 | AASA + `assetlinks.json` yayını **ve** Apple'da her iki App ID'ye Associated Domains capability'si — **üçü birlikte**, sonra `app.json`'a `ios.associatedDomains` geri eklenip **tek build ile** doğrulanır | Sen + ben |
| 4.2 | `master` branch protection | Sen |
| 4.3 | **Karar:** `master`'ı `main` ile senkronla — sürüm artışı yok, prod build tetiklemez, sadece iki dal ayrışmasın | Senin onayın |
| 4.4 | **Karar:** `main`'deki 48 Türkçe commit force-push ile İngilizce'ye çevrilsin mi? Yayınlanmış geçmiş — riskli, kazancı kozmetik | Senin kararın |

---

## Faz 5 — Teknik borç (fırsat buldukça)

| # | İş | Kaynak |
|---|---|---|
| 5.1 | `app/settings/payment-methods.tsx:49,73` satır içi `queryKey: ["saved-cards"]` → `qk.*` merkezî kayda taşı | Final inceleme M7 — CLAUDE.md §6 ihlali; ekran artık kullanıcıya açık olduğu için "erişilemez, önemsiz" savunması geçersiz |
| 5.2 | `payment-methods` ve `sales/[id]`'ye diğer ekranlardaki auth gate'ini ekle (tutarlılık) | Final inceleme M2 — veri sızıntısı yok, tutarsızlık var |
| 5.3 | Typing kablolamasının testi (`MessageInputBar` → `notifyTyping`, `MessageList` footer) | Final inceleme M4 — hook test edildi, kablolama edilmedi |
| 5.4 | `legalPages.ts` — `React` import edilmeden `React.ComponentProps` kullanılıyor (ambient global'e yaslanıyor) | Task 3 minor |
| 5.5 | `TypingIndicator` gereksiz `color` override'ı; `useMessageThread` içerik-filtresi öncesi `emitStop` | Task 4 minor |
| 5.6 | `app/category/__tests__/slug.test.tsx` J12.2 flake (paylaşılan `queryClient` + suite sırası) | Önceki oturum |
| 5.7 | Layout raporu özeti "3 Yüksek, 4 Orta, 3 Düşük" diyor — gerçek sayım **4 Yüksek, 4 Orta, 2 Düşük**. Özet düzeltilsin | Bu doğrulama |

---

## Önerilen yürütme

1. **Faz 0.1'i hemen yap** (15 dk) — şu an kırık, en ucuz kazanç
2. **Faz 1'i tek oturumda bitir** — dört madde de S, hepsi görünür kalite
3. Sen Faz 0.2/0.3 + 4.1/4.2'yi hallet (paralel, birbirini beklemez)
4. **Faz 2** — elle test gerektiği için sen build'i kurduktan sonra
5. **Faz 3.1 (i18n)** kendi planıyla, dilim dilim
6. Faz 5 fırsat buldukça

**Kota kuralı sabit:** EAS build yalnız senin açık komutunla. Faz 1–2 tamamen
OTA ile staging'e iner, build gerektirmez. Build gereken tek yer Faz 4.1'in
doğrulaması ve gerçek prod yayını.

---

# Build Bütçesi Politikası (2026-08-01)

## Gerçek durum

| | Değer |
|---|---|
| Aylık iOS kotası | **15** |
| Ağustos'ta harcanan | **5** (3 başarılı, **2 başarısız**) |
| Kalan | **10** |
| Temmuz | 15 — kota tam dolmuştu, "build alamıyoruz" dönemi buydu |

⚠️ **Başarısız build de kotadan düşüyor.** `be58beb` iki kez hata verdi (staging + production) ve ikisi de sayıldı. Bu yüzden "dener bakarız" yaklaşımı pahalı — build almadan önce derlenip derlenmeyeceğinden emin olmak lazım.

## Kural: neyin build gerektirdiği

`app.json`'da `runtimeVersion.policy: "fingerprint"`. Yani OTA yalnız **aynı fingerprint'e sahip** binary'lere ulaşır. Fingerprint şu dosyalar değişince değişir:

```
package.json · pnpm-lock.yaml · app.json · app.config.js · eas.json
google-services.json · ios/ · android/ · plugins/ · patches/ · credentials/
```

| Değişiklik türü | Maliyet |
|---|---|
| JS / TSX / stil / metin / test | **OTA — bedava, sınırsız** |
| Yukarıdaki listeden herhangi biri | **1 build** |

## Kalan işlerin sınıflandırması

| İş | Build gerekir mi |
|---|---|
| Faz 2 (tüm layout düzeltmeleri) | ❌ OTA |
| Faz 3.1 i18n (~%81 ekran) | ❌ OTA |
| Faz 5 teknik borç | ❌ OTA |
| **Faz 4.1 `associatedDomains` geri ekleme** | ✅ `app.json` → 1 build |
| **Üretim yayını** (`version` artışı) | ✅ `app.json` → 1 build |
| Faz 3.2 Android | ✅ ama **ayrı Android kotası** (15) |

**Sonuç: kalan tüm iş için gereken iOS build sayısı ≈ 2.** 10 hakkımız var, rahatız.

## Plan: native değişiklikleri BİRİKTİR

Native değişiklikleri tek tek göndermek kotayı boşa yakar. Bunun yerine:

1. **Şimdi → AASA hazır olana kadar:** her şey OTA. **Sıfır build.** Faz 2, Faz 3.1, Faz 5 buradan iner.
2. **AASA + Apple capability hazır olunca:** biriken TÜM native değişiklikleri tek commit'te topla ve **tek staging build** al. Bugün bilinen tek kalem `associatedDomains`; o güne kadar başka native değişiklik biriktiyse aynı build'e girer.
3. **Üretim yayını:** `version` artışı + `main` → `master` merge → **tek prod build**. Prod API ayakta olmadan yapılmaz.
4. **Android:** ayrı kota, iOS'u etkilemez. Önkoşulları (Play Console, service account, çift-client `google-services.json`) tamamlandığında başlar.

## Build almadan önce zorunlu kontrol listesi

Başarısız build kota yaktığı için, her build öncesi:

- [ ] `npx tsc --noEmit` temiz
- [ ] `npx eslint .` 0 hata
- [ ] Tam jest suite yeşil
- [ ] `app.json`'a yeni bir iOS **capability** (Associated Domains, Push, HealthKit…) eklendiyse: Apple Developer portal'da App ID'de o capability AÇIK MI? Değilse build Xcode adımında düşer ve kota yanar — 2026-08-01'de tam olarak bu oldu.
- [ ] Yeni native bağımlılık eklendiyse Expo SDK 54 ile uyumlu mu?

## Build tetikleme komutları

```bash
gh workflow run mobile-staging.yml --ref main -f mode=build      # staging → TestFlight
gh workflow run mobile-production.yml --ref master -f submit=false  # prod deneme (submit yok)
gh workflow run mobile-build.yml --ref main                        # simulator (Maestro girdisi)
```

Hiçbiri otomatik çalışmaz; yalnız açık komutla.
