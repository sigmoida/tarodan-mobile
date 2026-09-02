# Resolution Center cevabı — Guideline 1.2 (ikinci red)

Submission ID `0cb52531-6138-42ce-947c-23ffe4ddd639` reddine karşı.
Tek madde: **Guideline 1.2 — kullanıcı tarafından üretilen içerik**.

Apple'ın istediği üç şey vardı:

1. Kötüye kullanan kullanıcıyı **engelleme** mekanizması,
2. engellemenin **geliştiriciye bildirim** düşürmesi,
3. engellenen içeriğin kullanıcının akışından **anında kalkması**.

Üçü de karşılandı (bkz. `APP_REVIEW_1.2_ENGELLEME_DEVIR.md` §11 ve ana repo
`docs/USER_BLOCKING.md`). Ayrıca **fiziksel cihazda çekilmiş bir ekran kaydı**
istendi — aşağıdaki senaryo.

Gönderim sırası: (1) 1.0.3 build TestFlight'ta ve elle denenmiş,
(2) ekran kaydı çekilmiş ve Review Notes'a linki konmuş, (3) cevap yazılıp
**Add for Review**.

---

## Gönderilecek metin (İngilizce)

> Thank you for the review. We have implemented a full blocking mechanism in
> build 1.0.3.
>
> **Blocking abusive users.** A signed-in user can block another user from
> three places: the seller's profile (the ⋮ menu in the header), a listing
> detail screen (the flag icon → "Block seller"), and a conversation (the ⋮
> menu in the chat header). Blocking asks for confirmation and explains its
> effect. Blocks are listed under Profile → Blocked Users, where they can be
> lifted at any time.
>
> **The block is persistent and symmetric.** It is stored server-side, so it
> survives app restarts and applies across devices. Once a block is in place,
> neither party can see the other's listings, collections or profile, and
> messages, offers and trades are refused in both directions. Any pending
> follow relationship is removed.
>
> **The developer is notified.** Every block and every content report raises an
> in-app notification to all active administrators of our platform, carrying
> the reporter, the target, the reason, and the reported content. Our admin
> panel shows the reports queue and, on each user's page, the blocks given and
> received.
>
> **Blocked content leaves the feed immediately.** The blocked user's listings
> disappear from the home feed, search results, autocomplete, collections and
> the wishlist as soon as the block is placed; their profile and listing pages
> return "not found"; and their conversations drop out of the message list and
> the unread badge. We verified this on a device: immediately after blocking,
> opening a direct link to the blocked seller's profile or listing shows the
> "not found" screen.
>
> **Reporting content.** Reporting was already available and remains so, now on
> every surface: a listing, a user (from their profile or from a conversation),
> and a collection. Each report is stored, raises an admin notification, and is
> triaged in our admin panel.
>
> **Terms of service before registration.** The registration screen requires
> the user to tick "I accept the terms of use and the privacy policy" before an
> account can be created; the form cannot be submitted without it. The Terms of
> Service and the Privacy Policy are linked from that line and are also
> reachable from Profile → Settings.
>
> A screen recording made on a physical iPhone is provided in the Review Notes.
> It shows, in order: accepting the terms during registration, reporting a
> listing, and blocking a user (including the blocked user's content
> disappearing) and then unblocking from Profile → Blocked Users.
>
> Please let us know if anything else is needed.

---

## Review Notes'a yazılacaklar

App Store Connect → sürüm → **App Review Information → Notes**. Önceki
gönderimdeki metin korunur, altına şu blok eklenir:

    User-generated content safeguards (Guideline 1.2):

    Blocking a user — simplest path first:
      1. Open any listing → tap the seller's name to open their profile
      2. Tap ⋮ (top right) → Block → confirm
      The same action is also available from a listing detail
      (flag icon → Block seller) and from a conversation (⋮ → Block).
    Blocks are listed under Profile → Blocked Users and can be lifted there.

    Reporting content:
      • Listing detail → flag icon → Report listing
      • Seller profile → ⋮ → Report
      • Conversation → ⋮ → Report
      • Collection detail → flag icon

    Terms of service are accepted with a mandatory checkbox on the
    registration screen before an account is created.

    Screen recordings (physical iPhone, build 1.0.3):
      1. Terms of Service acceptance required before account creation
      2. Reporting a listing as inappropriate
      3. Blocking a user: content removed from the feed instantly,
         blocked list, and unblocking
    https://drive.google.com/drive/folders/1YNhxWWuXQgyoaREOM9aEoCtTkdwNRIsa

> **Demo hesabı uyarısı** — önceki gönderimden kalan açık madde: Review
> Notes'taki hesabın **satıcı olması ve en az bir yayında ilanı bulunması**
> gerekiyor, yoksa "Profile → My Listings" boş ekran gösterir. Engelleme
> akışının denenebilmesi için hesabın **başka bir satıcının ilanını görebiliyor**
> olması da şart (kendi ilanında engelleme menüsü çıkmaz — doğru davranış).

---

## Ekran kaydı senaryosu (fiziksel cihaz)

Apple açıkça **fiziksel cihazda** çekilmiş kayıt istiyor; simülatör kaydı
kabul edilmiyor. iPhone'da Kontrol Merkezi → Ekran Kaydı. Tek parça, kesintisiz
çekin; ses gerekmez. Hedef süre 60-90 sn.

**Hazırlık**

- Cihazda 1.0.3 TestFlight build'i kurulu olsun.
- Kayda başlamadan önce uygulamadan **çıkış yapın** (senaryo kayıt ekranıyla
  başlıyor).
- Engellenecek kullanıcı **kendiniz olmayan** bir satıcı olsun.

**Adımlar**

1. **Sözleşme onayı (kayıt öncesi)**
   Uygulamayı aç → *Kayıt Ol*. Formu doldurmadan aşağı in ve
   *"Kullanım koşullarını ve gizlilik politikasını kabul ediyorum"* satırını
   göster. Kutuyu **işaretlemeden** *Kayıt Ol*'a bas → hata mesajı görünsün.
   Sonra kutuyu işaretle. (Sözleşme linkine dokunup metnin açıldığını 2-3 sn
   göstermek iyi olur, sonra geri dön.)
   *Not: hesabı gerçekten oluşturmanız gerekmez; onayın zorunlu olduğunu
   göstermek yeterli. Kaydı tamamlamayacaksanız buradan geri çıkıp mevcut demo
   hesabıyla giriş yapın.*

2. **İçeriği şikayet etme**
   Ana sayfa → herhangi bir ilana gir → sağ üstteki **bayrak** ikonuna dokun →
   açılan menüde *İlanı Şikayet Et*'i seç → bir gerekçe seç → onay mesajını
   göster.

3. **Kullanıcıyı engelleme**
   Aynı ilanda tekrar **bayrak** ikonuna dokun → *Satıcıyı Engelle* → çıkan
   onay metnini (ne olacağını anlatıyor) 2 sn göster → *Engelle*'ye bas →
   başarı mesajını göster.

   > **Kaydı çekmeden önce:** TestFlight'tan kurduktan sonra uygulamayı bir
   > kapatıp yeniden aç. 1.0.3'ün düzeltmeleri OTA ile geliyor ve
   > `fallbackToCacheTimeout: 0` olduğu için güncelleme **ikinci açılışta**
   > uygulanıyor. Geldiğini şöyle anlarsın: bir ilana bak, çık, satıcıyı
   > engelle, o ilana geri dön — "Ürün bulunamadı" görmelisin.

4. **İçeriğin akıştan anında düşmesi**
   Geri dönüp **Ara** sekmesinde o satıcının ilanını aratın veya ana sayfada
   listelerde artık görünmediğini gösterin. (Daha güçlüsü: engellemeden önce
   ilanın göründüğü bir arama sonucunu kaydedin, engelledikten sonra aynı
   aramayı tekrarlayın.)

5. **Engellenenler listesi ve engeli kaldırma**
   *Profil* → aşağı in → **Engellenen Kullanıcılar** → engellenen kişinin
   listede olduğunu göster → *Engeli Kaldır* → liste boşalsın.

Kaydı bitirin. Dosyayı bir yere yükleyip (ör. Google Drive, herkese açık link)
adresini Review Notes'a yazın.

**Çekilen kayıtlar (2 Eyl 2026):** üç ayrı video, herkese açık Drive klasöründe —
oturum açmadan erişilebildiği doğrulandı (anonim istekte klasör adı ve üç dosya
da listeleniyor):
<https://drive.google.com/drive/folders/1YNhxWWuXQgyoaREOM9aEoCtTkdwNRIsa>

---

## Göndermeden önce son kontrol

- [x] `app.json` `expo.version` = **1.0.3**, `master`'a merge edilmiş, build
      TestFlight'a gönderilmiş (1.0.3 build 8) ve üç düzeltme OTA ile aynı
      binary'ye yayınlanmış.
- [ ] Build TestFlight'ta; **fiziksel iPhone'da** engelleme akışı elle denenmiş.
- [ ] Review Notes'taki demo hesabı çalışıyor, **satıcı** ve en az **bir yayında
      ilanı** var.
- [x] Ekran kaydı fiziksel cihazda çekilmiş, linki Review Notes'ta ve link
      oturum açmadan erişilebilir. (Üç video, Drive klasörü — doğrulandı.)
- [ ] Test sırasında konulan engeller **kaldırılmış** (production verisi temiz).
- [ ] Resolution Center cevabı yazılıp **Add for Review**.

### 1.0.3'e OTA ile giden düzeltmeler (yeni build alınmadı)

Ekran kaydı hazırlanırken akış cihazda sürüldü ve üç kusur çıktı; üçü de
JS olduğu için fingerprint değişmedi (`81b5237…` = build 8) ve
`eas update --branch production` ile aynı binary'ye yayınlandı:

1. **Engellenen satıcının ilanı önbellekten görünüyordu** — invalidasyon kümesi
   yalnız liste köklerini içeriyordu; `["products"]` tekil `["product", id]`
   anahtarını yakalamıyor. Apple'ın "içerik akıştan anında kalksın" şartını tam
   buradan deliyordu.
2. **İlan detayından engelleyince onay görünmüyordu** — snackbar'ı taşıyan ekran
   `router.back()` ile aynı anda sökülüyordu. Satıcı profili ve mesaj yolları
   etkilenmiyordu (onlar `appAlert` kullanıyor).
3. **Kayıt formunda İngilizce "Required" sızıyordu** — `defaultValues` bazı
   alanları tanımsız bırakıyordu.

**İnceleme açısından not:** uygulama `expo-updates` API'sini çağırmıyor ve
`fallbackToCacheTimeout: 0`; güncelleme ikinci açılışta uygulanıyor. İnceleyenin
ilk açılışta gömülü JS'i görme ihtimaline karşı Review Notes'ta engelleme için
**satıcı profili yolu** öne alındı — o yol düzeltme öncesi kodda da onay mesajı
gösteriyor (cihazda doğrulandı).

### Bu build'e giren, engellemeyle ilgisiz düzeltme

**Tarih alanı bir gün geri gösteriyordu.** `DateField` seçilen tarihi
`toLocaleDateString` ile biçimlendiriyordu; iOS'ta (Hermes) saat dilimi
verilmediğinde bu UTC'de biçimlendiriliyor ve **UTC+3'te bir önceki gün**
yazılıyordu — Türkiye'deki her kullanıcı için. Kullanıcı 1 Ocak 1990 seçiyor,
alanda "31 Aralık 1989" görüyordu (saklanan değer doğruydu, yalnız gösterim
yanlıştı — ama kullanıcı "düzeltmeye" kalkarsa yanlış tarih kaydeder).
Etkilenen üç alan: kayıt ve profil düzenlemedeki **doğum tarihi**, ilan
formundaki **indirim başlangıç/bitiş** tarihleri. Doğum tarihi Apple'ın
5.1.1(v) maddesinde zaten mercek altındaydı; bu build'e alınması isabetli.

Jest bunu yakalayamaz: Node'un `Intl`'i doğru davranıyor, hata yalnız iOS
motorunda görünüyor. Bu yüzden regresyon testi yerine düzeltme, nedeniyle
birlikte koda yorum olarak yazıldı.

### Bu build'e girmeyen, sonraya bırakılan maddeler

Native yüzeye dokunan her değişiklik yeni bir başarısızlık yolu açtığı ve bu
build'i tekrar veremeyeceğimiz için bilinçli olarak ertelendi:

- **`expo-camera` bağımlılığı hiç kullanılmıyor** (`launchCameraAsync` yok);
  Android'deki `RECORD_AUDIO` ve storage izinleri de ölü. Android yayında
  olmadığı için ikisi de şu an inceleme riski değil.
- **`EXPO_PUBLIC_SENTRY_DSN` production'da tanımsız** → Sentry production'da
  kapalı, bir sonraki red yine iz bırakmaz. Build almadan önce eklenebilir:
  `eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value <dsn>`
  (DSN depoda yok, Sentry projesinden alınacak). Bu bir env değişikliği; JS
  tarafında `services/sentry.ts` zaten hazır.
- **Yaş derecesi** App Store Connect'te elle 18+'a çekilmiş (hesaplanan 4+).
  Bilinçli değilse 13+ öneriliyor.
- **Anahtar kelimelerdeki marka adları** (`hot wheels`, `matchbox`) — 4.1
  metadata riski.
