# Resolution Center cevabı — üçüncü red (4 madde)

Submission ID `0cb52531-6138-42ce-947c-23ffe4ddd639` · inceleme 5 Eyl 2026 ·
incelenen sürüm 1.0.3 (8) · cihaz iPad Air 11" (M3).

Apple dört madde açtı. Durum:

| Madde | Ne isteniyor | Durum |
| --- | --- | --- |
| **1.2** UGC | Filtreleme + şikayet + engelleme, ve fiziksel cihazda ekran kaydı | Kod hazır ve iPad'de doğrulandı; **cevapta anlatım eksikti** |
| **2.1** Bilgi | "Pre-populated" demo hesabı | ❌ hesap boş — **senin doldurman gerek** |
| **2.1(b)** Tamlık | IAP ürünleri gönderilmemiş, yeni binary | ✅ **1.0.4** ile dijital satış iOS'tan kaldırıldı |
| **3.1.2(c)** Abonelik | Uygulama içi ve metadata'da EULA + gizlilik linki | ✅ uygulama tarafı düştü (abonelik satışı yok) · ⚠️ **ASC alanlarını doğrula** |

---

## 1.2 — neden tekrarladı

Mekanizmanın kendisinde sorun yok: inceleme cihazının eşinde (iPad Air 11" M3
simülatörü) doğrulandı, bayrak → *İlanı Şikayet Et* / *Satıcıyı Engelle* menüsü
çalışıyor. İki iletişim boşluğu vardı:

1. Apple kaydı **mesaja cevap olarak** istiyor; yalnız Review Notes'a koymak
   yetmemiş görünüyor.
2. Önceki cevap taslağımız Apple'ın saydığı üç önlemden **filtrelemeden hiç söz
   etmiyordu**. Altyapı duruyor (`ContentFilterService`: küfür kalıpları + admin
   panelinden yönetilen kural listesi + `moderateWithAI`; her içerik için
   `ModerationEvent` → `pass|review|flag|blocked`; istemcide gönderim öncesi
   `detectViolations`) ama anlatılmayan şey yok sayılıyor.

Gönderilecek İngilizce metin: `APP_REVIEW_CEVAP_1.2.md` → "Gönderilecek metin".

## 2.1 — demo hesabı (SENDE)

`bamehid878@slotbeer.com` production'da çalışıyor ama **bomboş**: 0 ilan,
0 sipariş, 0 mesaj, 0 koleksiyon, 0 takip. Apple'ın istediği "pre-populated"
tam olarak bunun tersi.

Uygulamada ~20 dakika:

- **2-3 ilan yayınla** (gerçek fotoğraf ve başlık; "test" yazma)
- **Bir koleksiyon** oluştur, birkaç ürün ekle
- **3-5 ürünü favorile**, birkaç satıcıyı takip et
- **İkinci bir hesaptan** demo hesabına mesaj at, karşılıklı 2-3 mesaj olsun

Hesabın **kayıtlı kartı ve adresi yok** — bu bilinçli bir güvenlik özelliği:
inceleyen "Hemen Al"a bassa bile kart ve adres girmeden gerçek bir sipariş
oluşturamaz. Doldururken kart ekleme.

## 2.1(b) — dijital satış iOS'tan kaldırıldı (1.0.4)

Apple "IAP ürünlerini göndermemişsiniz" diyordu; gerçek durum daha ağırdı:
**hiç IAP yoktu**, üyelik aboneliği ve ilan öne çıkarma (boost) uygulama içinde
PayTR ile satılıyordu. `3.1.1` uygulama içinde özellik açan abonelikleri,
`3.1.3(g)` ise adıyla "boost" satışını Apple'ın IAP'sine bağlıyor; `3.1.3`
anti-steering de web'e yönlendirmeyi yasaklıyor ve Türkiye vitrini istisna
değil (harici link entitlement'ı yalnız AB, ABD, Güney Kore ve Hollanda'da).

Seçilen yol: IAP entegre etmek yerine **iOS'ta dijital satışı kaldırmak**.
Tasarım `superpowers/specs/2026-09-06-ios-dijital-satis-kapisi-design.md`,
plan `superpowers/plans/2026-09-06-ios-dijital-satis-kapisi.md`.

**Fiziksel ticaret bilinçli olarak dokunulmadan bırakıldı** — `3.1.3(e)`
fiziksel malın IAP ile satılmasını **yasaklıyor**, yani sipariş/sepet/takas
ödemesinin PayTR'de kalması zorunlu.

### Resolution Center'a eklenecek paragraf

    The app no longer offers any digital purchase on iOS. Membership plans and
    listing promotion ("boost") are not sold in the app, no prices are shown,
    and there are no links or calls to action pointing to any external purchase
    mechanism. A member sees only their current plan and their account limits,
    and can cancel.

    Physical goods — the collectible models that are the marketplace's purpose —
    continue to be paid for with a payment method other than in-app purchase, as
    required by Guideline 3.1.3(e).

    Because there is no auto-renewing subscription offered in the app, the
    subscription disclosure requirements of Guideline 3.1.2(c) no longer apply
    to the binary. Our Privacy Policy and Terms of Use remain available at
    https://tarodan.com.tr/privacy and https://tarodan.com.tr/terms

## 3.1.2(c) — metadata (SENDE)

Uygulama içi abonelik kalmadığı için uygulama tarafı düştü. App Store
Connect'te doğrulanacaklar:

- **App Privacy → Privacy Policy URL** → `https://tarodan.com.tr/privacy` (200 döndüğü doğrulandı)
- **EULA**: standart Apple EULA kullanıyorsan kullanım koşulları linkini
  **App Description**'a koy; özel EULA kullanıyorsan ASC'deki **License
  Agreement** alanına gir → `https://tarodan.com.tr/terms` (200)

---

## Göndermeden önce son kontrol

- [ ] 1.0.4 build TestFlight'ta ve **fiziksel cihazda** gezildi: üyelik
      ekranında fiyat/paket yok, ilanlarım menüsünde "Öne çıkar" yok, misafir
      profilinde "Premium" kartı yok — ve **ürün satın alma çalışıyor**
- [ ] Demo hesabı dolduruldu (ilan + koleksiyon + favori + sohbet)
- [ ] Ekran kayıtlarının linki Review Notes'ta ve oturumsuz açılıyor
- [ ] ASC'de Privacy Policy URL ve EULA/App Description linki dolu
- [ ] Test sırasında konulan engeller kaldırıldı
- [ ] Resolution Center cevabı gönderildi → **Add for Review**

### Sonraki sürüme bırakılanlar

- **`EXPO_PUBLIC_SENTRY_DSN` production'da tanımsız** → Sentry kapalı. Değişken
  build anında paketlendiği için 1.0.4'e de girmedi. Mobil projenin DSN'i
  depoda yok, sentry.io'dan alınmalı:
  `eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value <dsn>`
- **Kullanılmayan `expo-camera` bağımlılığı** ve Android'in ölü izinleri
  (`RECORD_AUDIO`, storage) — Android yayında olmadığı için inceleme riski değil.
- **iOS'ta IAP** — abonelik satışı iOS'ta gerçekten gerekliyse ayrı bir iş:
  ASC ürünleri, StoreKit (native modül → yeni build), sunucuda makbuz
  doğrulama, "Restore Purchases", App Store sunucu bildirimleri. Komisyon %30,
  yıllık geliri 1M$ altında %15.
