# Plan B girdisi — tam parite denetimi bulguları

Kaynak: `docs/superpowers/reports/2026-08-26-tam-parite-denetimi.md` (tam ölçüm
gövdeleri, kova dağılımı, ledger rulingleri orada). Bu dosya yalnız planlamayı
kolaylaştırmak için — her bulgunun dosya/satırı bugün (2026-08-27) bu repoda
tek tek doğrulandı, güncel değil ise not düşüldü.

Sıra: kullanıcı zararı önce, sonra akışa göre gruplu — checkout/cart → orders
→ trades → listings → membership → messaging/notifications → profile/settings.
Her akış içinde öncelik etiketine göre sıralı.

---

## checkout / cart

### B6 — checkout kökündeki iki indirim kırılımı bildirilmemiş (P2)

- **Dosya/satır:** `src/lib/api/orders.ts:56` (`feeDiscountTotal?: number` —
  toplam alan var, alıcı/satıcı kırılımı yok) · tüketen:
  `app/checkout/_hooks/useCheckout.ts:345` · `app/checkout/_components/OrderSummary.tsx:54,112,116`.
  Yollar doğrulandı, hâlâ geçerli.
- **Doğru davranış:** sunucu `POST /orders/quote` kökünde
  `buyerFeeDiscountTotal` ve `sellerFeeDiscountTotal` de döndürüyor (ikisi de
  bugün `0`, aktif kampanya yok). Mobil yalnız toplam `feeDiscountTotal`'ı
  okuyor — kampanya açıldığında alıcı/satıcı ayrımı okunamaz.
- **Kanıt:** ölçüldü (Task 2, staging quote gövdesi).
- **Ölçüm/çıkarım:** ölçüldü.
- **Test şekli:** *eksik alan* — quote gövdesinde `buyerFeeDiscountTotal > 0`
  iken satırın ayrı gösterildiğini, `0` iken (bugünkü gerçek gövde) hiçbir şey
  kırmadığını sınayan bir kart testi.
- **Risk notu:** para satırı ama bugün etkisiz (her iki alan da `0`); acele
  değil, ama `OrderSummary.tsx` kampanya açıldığında sessizce yanlış kırılım
  göstermeye devam eder — CLAUDE.md'nin "toplamın altında açıklayıcı satır"
  deseni zaten kurulu (`quantityDiscount`/`feeDiscountTotal`), aynı desen
  tekrarlanmalı.

---

## orders

### B2 — satışlar listesinde alıcının ödediği toplam satıcıya gösteriliyor (P1)

- **Dosya/satır:** `app/sales/_components/SaleCard.tsx:43` →
  `formatPrice(sale.totalAmount)`. `app/sales/_lib/types.ts` `Sale` tipinde
  `pricing` alanı yok (satır 1-16 doğrulandı). Doğru kaynağı satış DETAYI
  zaten okuyor: `app/sales/[id]/_components/SaleDetailBody.tsx:29,34`
  (`p?.subtotal`, `p?.sellerNetAmount`). Yollar doğrulandı.
- **Doğru davranış:** liste kartı da `pricing.subtotal`'ı basmalı (ürün
  bedeli), `totalAmount`/`items[].price` DEĞİL — ikisi de alıcının kargo +
  alıcı hizmet bedeli + KDV dahil ödediği tutar, satıcının payı değil.
- **Kanıt:** ölçüldü —
  `{"subtotal":449.1,"totalAmount":557.6,"sellerNetAmount":325.32}` aynı
  siparişte; `items[0].price` de `557.6` (yedek DEĞİL, aynı yanlış tutar).
- **Ölçüm/çıkarım:** ölçüldü.
- **Test şekli:** *eksik alan* — `pricing.subtotal` doluyken kartın onu
  bastığını, `pricing` hiç gelmediğinde (eski gövde şekli) kartın çökmediğini
  sınayan bir birim/render testi.
- **⚠️ ÇEKİNCE — Plan B'yi yanıltmasın diye burada tekrar:** bu düzeltme
  web'e YAKINSAMIYOR, web'den AYRIŞIYOR. Web'in en yakın karşılığı
  (`profile/(insights)/statistics/_sections/RecentSalesSection.tsx:60`,
  `formatTL(sale.amount)`) aynı alıcı toplamını basıyor — web yalnız sipariş
  KARTLARINDA (`e6b48165a`) `pricing.subtotal`'a geçti, satış özet listesinde
  geçmedi. Task başlığı **"parite düzeltmesi" OLMAMALI** — bu bir doğruluk
  düzeltmesi, mobilin web'in bilinen hatasını miras almamasıdır.

### B10 — çok satıcılı grup yanıtındaki `packages.*` hiç okunmuyor (P2)

- **Dosya/satır:** `app/orders/group/[id]/_lib/types.ts` — `GroupOrder`/
  `GroupDetail` (satır 1-38, doğrulandı) hiçbir `packages` alanı bildirmiyor.
- **Doğru davranış:** `GET /orders/groups` yanıtındaki `groups.data.packages[]`
  (satıcı bazlı kargo/takip kırılımı) tipe eklenmeli ve grup ekranında her
  satıcının ayrı kargo/takip satırı gösterilmeli.
- **Kanıt:** ölçüldü (Task 1) — gövdede dolu.
- **Ölçüm/çıkarım:** ölçüldü.
- **Test şekli:** *eksik alan* — `packages` doluyken satıcı başına ayrı satır
  render edildiğini, `packages` gelmediğinde (eski/kısmi gövde) ekranın
  çökmediğini sınayan bir render testi.
- **Risk notu:** bekçi bunu kendi başına yakalayamadı çünkü `orders`,
  `seller`, `cargo` gibi yaprak adları kod tabanının başka yerlerinde zaten
  bildirilmiş — "yaprak-adı çakışması" sınıfının örneği (ledger F2). Yeni
  ekran bölümü gerektiriyor, küçük bir eşleme düzeltmesi değil.

---

## trades

### B1 — takas takip linki iç referansla kuruluyor, gerçek Sürat koduyla değil (P1)

- **Dosya/satır:** `app/trade/[id]/_components/TradeShippingSection.tsx:87,126,160,203`
  — `openSuratTrack(...)` her çağrıda `shipment.trackingNumber` (Tarodan iç
  referansı, `TKS-…`) geçiyor. `TradeShipment` tipi
  (`app/trade/[id]/_lib/types.ts:4-11`) `cargoCode` alanını HİÇ bildirmiyor —
  gerçek Sürat kodunun linke ulaşabileceği bir yol yok. Yollar doğrulandı,
  satır numaraları bugün de aynı.
- **Doğru davranış:** sipariş tarafı aynı sorunu zaten
  `deriveShipmentView` (`src/lib/shipping/tracking.ts:50-62`) ile çözmüş
  (`cargoCode = s.providerTrackingId || fallback`, `reference = s.trackingNumber`).
  Takas tarafı bu yardımcıyı hiç çağırmıyor; `TradeShipment`'a `cargoCode`
  eklenip `openSuratTrack` ona yönlendirilmeli.
- **Kanıt:** ölçüldü (Task 2) — `cargoCode = "12516210181141"`,
  `trackingNumber = "TKS-…-WH-INI"` aynı shipment kaydında, ikisi farklı
  değer.
- **Ölçüm/çıkarım:** ölçüldü.
- **Test şekli:** *eksik alan* — `cargoCode` doluyken linkin ondan kurulduğunu,
  `cargoCode` yokken (kod hazırlanıyor durumu) linkin devre dışı/beklemede
  gösterildiğini sınayan bir birim testi (`deriveShipmentView` zaten test
  edilmiş — aynı deseni `TradeShippingSection`'a taşıyan bir entegrasyon
  testi yeterli).
- **Risk notu:** en ucuz düzeltme — yardımcı fonksiyon zaten yazılı, sadece
  çağrılmıyor. Kuyrukta ilk sırada olmasının sebebi bu (öncelik etiketi P1
  olsa da).

### B7 — anlaşmazlık akışı yaz-only: sonuç hiç okunmuyor (P2)

- **Dosya/satır:** `app/trade/[id]/_lib/types.ts` (dispute alanı yok) ·
  `app/trade/[id]/_hooks/useTradeActions.ts:120-133` (yalnız `POST
  /trades/:id/dispute` yazan mutation var, okuma yok) ·
  `app/trade/[id]/_modals/DisputeTradeModal.tsx` (yalnız açma formu). Yollar
  doğrulandı — kod tabanında `raisedById`/`resolution`/`resolvedAt` hiçbir
  yerde geçmiyor.
- **Doğru davranış:** takas detayı `dispute.raisedById`/`resolution`/
  `resolvedAt` alanlarını okuyup anlaşmazlığın durumunu/sonucunu göstermeli
  (bugün yalnız statik "inceliyoruz" metni var, sonuç ekranda hiç görünmüyor).
- **Kanıt:** ölçüldü (Task 2) — alanların VARLIĞI ölçüldü (`raisedById` dolu,
  `resolution`/`resolvedAt` `null`, açık bir örnekte).
- **Ölçüm/çıkarım:** kısmen ölçüldü, kısmen çıkarım.
- **⚠️ ÇEKİNCE — bu maddeyi kapatan task'tan ÖNCE gerekli:** staging'de
  ÇÖZÜLMÜŞ bir anlaşmazlık örneği hiç görülmedi. Yani `resolution`/
  `resolvedAt` DOLU hâlinin ŞEKLİ (metin mi, enum mu, kim yazıyor) ÖLÇÜLMEDİ —
  yalnız çıkarım. Task'ın ilk adımı çözülmüş bir takas anlaşmazlığı örneği
  bulup ölçmek olmalı; bulunamazsa ekran metni alanların varsayılan şekli
  üzerine KURULMAMALI (spekülatif tip yazmak, denetimin kaçındığı hatanın
  aynısı olur — bkz. `rejectionReason`/`color` grubu dersleri).
- **Test şekli:** ölçüm netleşene kadar belirlenemez — muhtemelen *eksik
  alan* (dolu/boş `resolution` render farkı), ama şekil ölçülmeden test
  yazmak uydurma olur.
- **Risk notu:** yeni ekran bölümü + ürün kararı gerektiriyor, tek satırlık
  düzeltme değil.

---

## listings

### B3 — `suspended` ilan durumu hiç tanınmıyor (P1)

- **Dosya/satır:** `app/settings/my-listings/_lib/types.ts` — `getStatusColor`
  (satır 35-53) ve `statusTextKey` (satır 55-73) `suspended` dalını
  taşımıyor → `statusTextKey` `null` döner. `app/settings/my-listings/_components/MyListingsSections.tsx:138-140`
  (`{statusTextKey(...) ? t(...) : listing.status}`) ham `suspended` basıyor.
  `FILTER_CHIPS` (`MyListingsSections.tsx:62`) sekiz durumu sayıyor,
  `suspended` yok. `app/settings/my-listings/_components/MyListingsModals.tsx:30`
  (`status !== 'sold' && status !== 'deleted'`) askıdaki ilana "Düzenle"
  sunuyor. Yollar doğrulandı, satır numaraları raporla eşleşiyor (küçük
  kaymalar dışında).
- **Doğru davranış:** `suspended` durumu üçüncü bir renk/etiketle
  haritalanmalı, filtre çipine eklenmeli, ve menüde "Düzenle" YERİNE
  askıya alınma nedenini gösteren salt-okunur bir durum sunulmalı.
- **Kanıt:** ölçüldü — `/products/my` içinde 1 adet `status: "suspended"`.
- **Ölçüm/çıkarım:** ölçüldü.
- **Test şekli:** *eksik/beklenmeyen değer* — `suspended` durumundaki bir
  ilan render edildiğinde ham kodun basılmadığını, menüde "Düzenle"
  ÇIKMADIĞINI sınayan bir render testi.
- **Risk notu:** `GET /products/my/stats` `counts` nesnesi de `suspended`
  saymıyor (ölçüldü). Bir filtre çipi eklenirse sayacın nereden geleceği açık
  bir soru — backend'e SORULMADI. Task ya sayacı çekili listeden hesaplamalı
  ya da bu soruyu ürün/backend'e açıkça sormalı; sessizce backend'den
  gelecekmiş gibi varsayılmamalı.

---

## membership

### B5 — premium tespiti `limits.maxListings === -1` ile yapılıyor, sunucu böyle bir alan döndürmüyor (P1)

- **Dosya/satır:** `app/settings/analytics/_hooks/useAnalytics.ts:19`
  (`const isPremium = limits?.maxListings === -1`) ·
  `app/settings/analytics/_components/AnalyticsContent.tsx:113,152` (premium
  bölümü + yükseltme kutusu kapıları) · kaynak bindirme:
  `src/hooks/useMembershipLimits.ts:44`
  (`out.maxListings = dto.maxTotalListings`). Yollar doğrulandı, satır
  numaraları raporla eşleşiyor.
- **Doğru davranış:** premium tespiti aynı yanıttaki `tierType === "premium"`
  alanından yapılmalı — `maxListings` diye bir alan hiçbir zaman `-1` değeri
  taşımıyor (bindirmeden dolayı her zaman gerçek bir sayı: `200`).
- **Kanıt:** ölçüldü — `/membership/me/limits` →
  `{"maxTotalListings":200,"tierType":"premium"}`, `maxListings` alanı yok.
- **Ölçüm/çıkarım:** ölçüldü.
- **Test şekli:** *wrong gate* — `isPremium` hesaplayan pure fonksiyon/hook
  üzerinde `tierType` girdisine göre doğru boole döndüğünü sınayan bir birim
  testi (`limits?.maxListings === -1` deseninin bir daha sızmadığını
  doğrulayan bir regresyon testi olarak da işaretlenmeli).
- **Risk notu:** `useMembershipLimits()` `app/_layout.tsx:76`'da kökte
  çağrılıyor; sorgu çözülene kadar `limits` `TIER_LIMITS`'ten gelir ve orada
  premium `-1`'dir — yani ilk render'da bir an premium bölüm görünüp sonra
  gizlenebilir (Metro'da GÖRMEDİM, koddan çıkardım — kalıcı hâl kesin ve
  ölçülü). Task bu geçiş penceresini de göz önünde bulundurmalı.
  `limits.maxListings` başka iki yerde de "kota sayısı" anlamıyla doğru
  okunuyor (`useMyListings.ts:231`, `authStore.ts:541-549`) — bunlara
  DOKUNULMAMALI, yalnız `useAnalytics.ts:19`'daki `-1` karşılaştırması
  hatalı.

### B11 — 2FA kurulumu `payload.qrCode` okuyor; sunucu `qrCodeUrl`/`qrCodeImage` döndürüyor (P1)

- **Dosya/satır:** `app/settings/security/_hooks/useSecurity.ts:149`
  (`const [, setTotpQr] = useState("")` — okuyucu YOK, yazıcı atılıyor) ve
  `:194` (`setTotpQr(payload.qrCode ?? "")` — sunucuda `qrCode` diye bir alan
  yok). Yollar doğrulandı, satır numaraları güncel.
- **Doğru davranış:** sunucu sözleşmesi
  (`apps/api/src/modules/security/dto/security.dto.ts:14-21`, ana repo)
  `qrCodeUrl` (otpauth URI) ve `qrCodeImage` (`data:image/png;base64,...`)
  döndürüyor. `qrCodeImage` bir state'e yazılıp `<Image>` ile çizilmeli
  (tercihen `qrCodeImage`, o hazır PNG — `qrCodeUrl`'den istemcide QR
  üretmek gereksiz).
- **Kanıt:** ana repo DTO'su (`security.dto.ts:14-21`,
  `security.service.ts:76,111` `QRCode.toDataURL(...)`,
  `two-factor-qr.spec.ts:42`). Canlı yanıt ÖLÇÜLMEDİ — uç bir mutasyon,
  paylaşılan `ahmet@demo.com` demo hesabında iki adımlı doğrulamayı açardı.
- **Ölçüm/çıkarım:** karışık. Mobil taraftaki kırıklık (yanlış alan adı + atılan
  state) koddan KESİN. Sunucu yanıtının alan adlarının canlıda birebir bu
  şekilde geldiği ÖLÇÜLMEDİ — **task'ın ilk adımı ayrı bir test hesabıyla
  `POST /auth/2fa/enable` çağrılıp gövde ölçülmeli**, sonra tipe yazılmalı.
- **Test şekli:** *eksik alan* + *wrong gate* karışımı — `qrCodeImage`
  doluyken state'e yazıldığını ve render edildiğini sınayan bir birim testi;
  `const [, setTotpQr]` deseninin bir daha kullanılmadığını (lint/kod
  incelemesiyle) doğrulamak da işin parçası.
- **Risk notu:** iki ayrı kırık — alan adı yanlış OLSA BİLE değer zaten
  atılıyor (`const [, ...]`), yani ikisi birden düzeltilmezse QR yine
  çizilmez. `secret` ve `backupCodes` zaten doğru okunuyor/gösteriliyor —
  yalnız QR yolu ölü. B5 ile aynı sınıf ("tipte/kodda var, yanıtta yok" /
  "yanlış ad"); aynı task'ta ele alınırsa sınıfın kendisi de belgelenmiş
  olur.

---

## messaging / notifications

### B9 — `normalizeThread` `productTitle`/`productImage`'ı eşlemiyor (P1)

- **Dosya/satır:** `src/lib/messaging/normalize.ts:24-52`
  (`normalizeThread`) — `participant1`/`participant2` düzleştirmesi var,
  ürün alanları için karşılığı yok. Yol doğrulandı, satır numaraları
  raporla eşleşiyor (fonksiyon 24'te başlıyor, 52'de bitiyor).
- **Doğru davranış:** sunucunun `thread.productTitle`/`thread.productImage`
  alanları `thread.product = { title, image }` gibi bir alt nesneye
  eşlenmeli; `ThreadRow` bu alanı okuyup ürün adı/görselini göstermeli
  (bugün alanı bulamayınca "Genel mesaj" yazıyor — ürün üzerinden başlamış
  sohbetlerde bile).
- **Kanıt:** ölçüldü (Task 3) — fixture'daki iki thread'in ikisinde de
  alanlar DOLU.
- **Ölçüm/çıkarım:** ölçüldü.
- **Test şekli:** *eksik alan* — `productTitle`/`productImage` doluyken
  `normalizeThread` çıktısında `thread.product` doldurulduğunu, alanlar
  gelmediğinde (eski gövde) "Genel mesaj" davranışının BOZULMADIĞINI
  sınayan bir birim testi.
- **Risk notu:** düşük risk, tek fonksiyonluk eşleme; paylaşılan yardımcı
  (`normalizeThread` hem `threads` hem tekil `thread` sorgusunda kullanılıyor)
  olduğu için tek düzeltme iki yeri birden kapatır.

---

## profile / settings

### B8 — `me.birthDate` `mapApiUserToUser`'da haritalanmıyor (P1)

- **Dosya/satır:** `src/stores/authStore.ts:239-317`
  (`mapApiUserToUser`) — `birthDate` taşınmıyor. Tüketen:
  `app/settings/edit-profile/_hooks/useEditProfile.ts:54`
  (`birthDate: (user as any)?.birthDate ? ... : ''`). Yollar doğrulandı.
- **Doğru davranış:** `mapApiUserToUser` sunucunun `birthDate` alanını
  `User` nesnesine taşımalı.
- **Kanıt:** ölçüldü (Task 3) — `/users/me` alanı döndürüyor.
- **Ölçüm/çıkarım:** ölçüldü.
- **Test şekli:** *eksik alan* — `mapApiUserToUser` girdisinde `birthDate`
  doluyken çıktıda taşındığını, alan `null`/yok iken formun boş açılıp
  ÇÖKMEDİĞİNİ sınayan bir birim testi.
- **Risk notu:** düşük risk, tek satırlık eşleme eksikliği; ama sessiz veri
  kaybı sınıfında (kaydedilmiş değer görünmeden kayboluyor) — B9 ile aynı
  aile.

### B4 — hukuki künye uydurma; destek/info e-postaları var olmayan alan adında (P1)

- **Dosya/satır:** `app/distance-sales.tsx:31-35` (Unvan: "Tarodan Teknoloji
  A.Ş." — böyle bir tüzel kişi yok; Adres: "İstanbul, Türkiye" — gerçek adres
  Torbalı/İZMİR; E-posta `COMPANY_INFO_EMAIL`; Telefon yer tutucu) ·
  `app/privacy.tsx:126` (aynı yanlış adres tekrarı, KEP hiç yok) ·
  `src/constants/legalFacts.ts:33-41` (yedi posta kutusu, hepsi
  `tarodan.com` — ana repoda yalnız `tarodan.com.tr` uzantılı iki kutu
  gerçek). Mobil dosya yolları bugün doğrulandı. Karşılık kaynağı ana repo
  `apps/web/src/lib/legal/platform-entity.ts` (`origin/development`) —
  **bu repodan doğrulanamaz**, sonraki task ana repoyu `git grep`/`git show`
  ile tekrar teyit etmeli.
- **Doğru davranış:** tek kaynak `legalFacts.ts` ana reponun
  `PLATFORM_ENTITY` değerleriyle eşlenmeli: unvan "Serhatlar Oyuncak Temizlik
  Gıda Maddeleri İnşaat Sanayi ve Ticaret Limited Şirketi", vergi no
  `7620277268 – Torbalı/İZMİR`, adres "Yenişehir Mah. 1145/2 No:3
  Torbalı/İZMİR", telefon "0 232 433 41 42", e-posta `destek@tarodan.com.tr`,
  KEP `serhatlaroyuncak@hs03.kep.tr`, site `www.tarodan.com.tr`. Karşılığı
  olmayan beş posta kutusu (`info@`, `legal@`, `privacy@`,
  `seller-support@`, `security@`, `ip@` — hepsi `tarodan.com`) kaldırılmalı;
  ana repoda yalnız `destek@tarodan.com.tr` ve `legal@tarodan.com.tr` gerçek.
- **Kanıt:** ana repo tek kaynağı (`platform-entity.ts`, `origin/development`)
  ile karşılaştırıldı.
- **Ölçüm/çıkarım:** staging'den ölçülemez (içerik istemcide sabit,
  ölçülecek bir uç yok) — kaynak ana repo dosyası.
- **Test şekli:** *text-matched behaviour* — ekranın basılı hukuki metnini
  `legalFacts.ts` sabitlerine karşı doğrulayan bir kaynak/assertion testi
  (davranış testi Türkçe metne bakar, ikisi de aynı yanlış değeri
  basıyor olsa geçerdi — bu yüzden sabitlere karşı test şart).
- **Risk notu:** düşük teknik risk ama yüksek hukuki/itibar riski — mesafeli
  satış sözleşmesi ve KVKK metni yanlış tüzel kişi/adres/tebligat kanalı
  gösteriyor, yazılan destek e-postası geri dönüyor. Ölçülemeyen bir alan
  olduğu için task'ın kanıtı kod karşılaştırması olacak, staging isteği
  değil — planlarken bu netleştirilmeli.

### B13 — kurumsal kayıtta KEP adresi opsiyonel (P3)

- **Dosya/satır:** `app/(auth)/register-business/_lib/schema.ts:68`
  (`kepAddress: optionalEmailSchema`). Yol doğrulandı.
- **Doğru davranış:** web'in şeması KEP'i zorunlu tutuyor
  (`RegisterBusinessForm.tsx:124`, ana repo, `*` işaretli); mobil şeması da
  zorunlu kılmalı.
- **Kanıt:** ana repo — web zorunlu, API DTO'su
  (`business-register.dto.ts:49`, `kepAddress?: string`) opsiyonel. Yani bu
  bir SUNUCU sözleşmesi farkı değil, bir ÜRÜN KARARI farkı; sunucu her iki
  şekli de kabul eder.
- **Ölçüm/çıkarım:** çıkarım (POST çağrılmadı — staging'e sahte kurumsal
  hesap yazardı).
- **Test şekli:** *wrong rule* — zod şemasının `kepAddress` boşken
  reddettiğini sınayan bir birim testi.
- **Risk notu:** düşük risk, tek satırlık şema değişikliği; kurumsal hesap
  bugün yasal tebligat kanalı olmadan başvuru gönderebiliyor olması dışında
  yıkıcı bir etkisi yok.

---

## İmplementasyon görevi OLMAYAN maddeler

Bunlar Plan B'nin görev listesine GİRMEMELİ — ayrı ele alınmalı.

### Geri çekilen bulgular

- **B12 — checkout hizmet bedeli oranı.** `checkout.platformServiceFeeWithRate`
  i18n kataloğunda var ama `apps/web` hiç kullanmıyor; web de oransız
  gösteriyor. Parite temeli yok — en fazla iki istemciye birden açık bir
  ürün önerisi, bu denetimin kapsamı dışında.
- **B14 — `relatedOrder`/`relatedTrade`.** `bc73db263` alanları hem API'den
  hem web'den BİLEREK kaldırdı. `docs/PARITE_KALAN_ISLER.md`'de İKİ TUR
  boyunca "backend bekliyor" diye yanlış kayıtlıydı — bu turda beş yerde
  düzeltildi (bkz. o dosyanın 2026-08-27 bölümü). Backend backlog'una
  AÇILMAMALI.

### Backend-owned (bu turda yeni madde yok)

Bu denetim turunda **backend'e devredilen yeni madde YOK.** Zaten kayıtlı
backend bekleyenler (`docs/PARITE_KALAN_ISLER.md` → "Backend bekleyenler"
tablosu: iade onay/ret ucu, IP-blok 403 ayırt edici alanı, kupon reddi
yapısal alanı, Android `assetlinks.json`, misafir takipte gerçek Sürat kodu,
`MembershipLimits`'in yayınlanmayan 10 alanı, `color` seed'i) bu turda
YENİDEN dokunulmadı, hiçbiri değişmedi.

### Taranmamış sınıf — bekçinin ikinci yönü (önerilen sonraki turun ilk işi)

`src/lib/api/__tests__/contractCoverage.ts` bugün yalnız TEK yönü tarıyor:
"sunucunun yanıtında VAR, mobilin tipinde YOK" (`undeclaredFields`, ölçülmüş
gövdenin alan yollarını çıkarıp tip dosyasında aranmayan adları raporluyor).
Tersi — **"mobilin kodu bir alanı OKUYOR, sunucunun ölçülmüş yanıtında o alan
YOK"** — hiç taranmıyor. Bu turda o sınıftan iki canlı, doğrulanmış örnek
çıktı (B5: `limits.maxListings`, B11: `payload.qrCode`) — ikisi de bekçiden
değil kod okunarak bulundu.

**Mekanizma zaten kurulu, ikinci yön ucuz olmalı:**
`fieldPaths(body)` ölçülmüş fixture'ın gerçek alan yollarını zaten çıkarıyor.
İkinci yön için gereken: (1) fixture'ın kapsadığı domain'e karşılık gelen
kod tabanında `<değişken>.<ad>` / `payload.<ad>` / `dto.<ad>` gibi erişim
desenleriyle okunan tüm ad'ları toplayan bir tarayıcı, (2) bu adları
`fieldPaths(body)`'nin ürettiği YAPRAK ad kümesiyle (B5/B11'deki
`undeclaredFields`'in kullandığı `leafOf` mantığının simetriği) karşılaştırıp
kümede olmayanları raporlayan bir fonksiyon. Yanlış pozitif kaynakları
şimdiden belli: istemcinin kendi türettiği alanlar (ör. `isPremium`,
`cargoCode` gibi mobilin hesapladığı ad'lar sunucudan gelmeyebilir ama
alan-okuma deseni değildir), ve aynı ad başka bir sözleşmede meşru olarak
geçebilir (yaprak-adı çakışması, F2 rulingi burada da geçerli). Allowlist
deseni (`KNOWN_UNDECLARED`) zaten kurulu, aynı desen ikinci yön için de
kullanılabilir. Bu, önerilen sonraki denetim turunun İLK görevi olmalı —
B5/B11 sınıfının bir daha yalnız "kod okuyarak" bulunmasını önler.
