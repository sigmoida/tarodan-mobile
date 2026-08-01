# Layout / Kayma Denetimi — 2026-08-01

Branch: `feat/parite-p2`. Yalnız denetim — hiçbir kaynak dosya değiştirilmedi.

## Özet

10 bulgu tespit edildi (3 Yüksek, 4 Orta, 3 Düşük). Kullanıcının bildirdiği
"kayma", tek bir hata değil; **üç ayrı kök nedenin** farklı ekranlarda aynı
belirtiyi üretmesi:

1. **Kendi verisine göre `return null` veren bloklar** — her bağımsız query kendi
   zamanında dönüyor, dönünce blok yoktan var oluyor ve altındaki her şey aşağı
   kayıyor. Ana sayfada bu 7 kez arka arkaya oluyor (B1, B2, B6).
2. **`isLoading` dalında farklı yükseklikte içerik** — Spinner bloğu ~150pt, veri
   gelince yerine geçen içerik ~250-300pt. Yükseklik farkı = zıplama (B2, B3).
3. **`paddingTop: 50` / `top: 50` hardcode'u** — `ScreenHeader` insets'i doğru
   uyguluyor ama 7 ekran onu atlayıp sabit 50 yazmış; Dynamic Island'lı iPhone'da
   (insets.top ≈ 59-62) header içeriği status bar'a giriyor (B5).

Ayrıca 4 ekran hiç üst boşluk almıyor — ne header ne insets ne padding (B4).

Denetlenmeyen/temiz çıkan eksenler: **klavye** (form ekranlarında
`KeyboardAvoidingView` + doğru `Platform` ayrımı var — `src/ui/components/Modal.tsx:36-37`
ve 9 ekranda tutarlı; modaller `@/ui` Modal üstünden bunu ücretsiz alıyor) ve
**tab bar alt boşluğu** (`AppTabBar` normal `tabBar` prop'u ile çiziliyor, absolute
değil — ekran içeriğiyle çakışmıyor; `app/(tabs)/_components/AppTabBar.tsx:40`
`height: 56 + bottom`).

---

## Bulgular

### B1: Ana sayfa açılışta 2-3 kez aşağı zıplıyor — okumaya başladığın yer kayıyor

- **Belirti:** Ana sayfa açılıp içerik göründükten SONRA, en üstte bir reklam
  banner'ı beliriyor ve tüm akış ~110-130pt aşağı iniyor. Ardından kategoriler,
  koleksiyoner kartı, sponsorlu ürünler, koleksiyonlar sırayla belirip her
  seferinde altındakini itiyor.
- **Kök neden:** Ana sayfa 8 bağımsız query kullanıyor ve her section verisi
  gelene kadar **hiç yer kaplamıyor**:
  - `src/components/ads/AdBanner.tsx:67` — `if (ads.length === 0) return null;`
    Reklam query'si çözülene kadar banner yok; çözülünce **ScrollView'ın en
    tepesine** giriyor (`app/(tabs)/index.tsx:88`) → altındaki her şey kayıyor.
    En kötü konum, çünkü kullanıcı o an ekranın üstüne bakıyor.
  - `app/(tabs)/_components/HomeSections.tsx:73` (`CategoriesSection`),
    `:124` (`FeaturedCollectorSection`), `:175` (`BoostedRail`),
    `:220` (`ProductsGrid`), `:236` (`CollectionsSection`) — hepsi
    `if (… .length === 0) return null`.
  - Banner yüksekliği ayrıca `aspectRatio`'yu sunucudan alıyor
    (`src/components/ads/AdBanner.tsx:34`); sunucu `width/height` vermezse
    4:1 fallback'e düşüyor, gerçek görsel farklı oranlıysa ikinci bir kayma olur.
- **Etkilenen:** `app/(tabs)/index.tsx:88-98`,
  `src/components/ads/AdBanner.tsx:34,67`,
  `app/(tabs)/_components/HomeSections.tsx:73,124,175,220,236`
- **Önerilen düzeltme:** Reklam slotu için query `isPending` iken de yer ayır —
  `AdBanner`'ı `ads.length === 0 && !isPending → null`, `isPending → aspectRatio'lu
  boş placeholder` yapmak yeterli (yeni primitive gerekmez, mevcut `styles.slot`
  arka planıyla). Section'lar için: `return null` yerine, ilgili query hâlâ
  yükleniyorken sabit yükseklikli bir iskelet bas (`@/ui`'deki `Spinner` yerine
  section'ın kendi yüksekliğinde boş `View`). Alternatif ve daha ucuz yol: 8
  query'yi tek bir "hazır mı" bayrağında toplayıp akışı bir kerede göstermek.
- **Şiddet:** Yüksek

### B2: "Popüler İlanlar" rafı yüklenince sayfanın yarısı yukarı sıçrıyor

- **Belirti:** Ana sayfada koyu renkli "Popüler İlanlar" bölümü önce içinde
  dönen bir spinner ile duruyor, ürünler gelince o kutu birden büyüyor ve
  altındaki "Tüm İlanlar" + "Koleksiyonlar" aşağı fırlıyor.
- **Kök neden:** Klasik `{isLoading ? <Spinner/> : <Content/>}` yükseklik
  uyumsuzluğu. Loading kutusu `paddingVertical: 50` + spinner + metin ≈ 150pt
  (`app/(tabs)/_lib/styles.ts:451-455`), yerine geçen yatay ürün rafı ise kart
  görseli 140pt + başlık + fiyat ≈ 250pt+ (`app/(tabs)/_lib/styles.ts:336-339`).
  Boş durum kutusu da (`:462-466`) üçüncü bir yükseklik.
- **Etkilenen:** `app/(tabs)/_components/HomeSections.tsx:197-214`,
  `app/(tabs)/_lib/styles.ts:451-455,462-466,336-339`
- **Önerilen düzeltme:** Üç dalı da (loading / empty / content) tek bir sabit
  `minHeight` veren sarmalayıcının içine al. Rafın gerçek yüksekliği stylesheet'te
  zaten hesaplanabilir (`productImage.height` 140 + metin bloğu).
- **Şiddet:** Yüksek

### B3: Mesaj ekranı okurken kendi kendine en alta atıyor

- **Belirti:** Konuşma geçmişini yukarı kaydırıp okurken, karşı taraf yazmaya
  başlayınca ya da bir görsel yüklenince liste kendiliğinden en alta kayıyor —
  okunan yer kayboluyor.
- **Kök neden:** `onContentSizeChange` → koşulsuz `scrollToEnd({ animated: true })`.
  Kullanıcının o an nerede olduğuna bakılmıyor. İçerik boyutu; (a) mesaj görselleri
  yüklenince, (b) `TypingIndicator` görünüp kaybolunca (`ListFooterComponent`
  yüksekliği değişiyor), (c) yeni sayfa yüklenince değişiyor — her birinde yank.
- **Etkilenen:** `app/messages/[threadId]/_hooks/useMessageThread.ts:73-83`
  (`else` dalı), `app/messages/[threadId]/_components/MessageList.tsx:138-146`
- **Önerilen düzeltme:** `else` dalını "yalnız kullanıcı zaten dibe yakınsa
  kaydır" koşuluna bağla (son `onScroll` offset'i ile). Daha temiz çözüm: FlatList'i
  `inverted` yap veya `maintainVisibleContentPosition` kullan — o zaman
  `scrollToEnd` çağrısına hiç gerek kalmaz. `TypingIndicator`'ı da footer'da
  değil, sabit yükseklikli bir alanda tut ki görünürlüğü content size'ı
  değiştirmesin.
- **Şiddet:** Yüksek

> **Güncelleme (2026-08-01, plan3-p2):** `TypingIndicator`'ın bu tetikleyicisi
> kapatıldı — `MessageList.tsx`'te gösterge artık sabit yükseklikli bir
> `typingIndicatorFooter` sarmalayıcı içinde; görünüp kaybolması `ListFooterComponent`
> yüksekliğini artık değiştirmiyor. (a) ve (c) tetikleyicileri hâlâ geçerli.

### B4: Bazı ekranların üstü status bar'ın / çentiğin altında kalıyor

- **Belirti:** Koleksiyon detayı, ilan düzenleme gibi ekranlarda en üstteki
  geri butonu / içerik saatin ve çentiğin altına giriyor, dokunulamıyor.
- **Kök neden:** Root `Stack` tüm rotalarda `headerShown: false`
  (`app/_layout.tsx:147`) ve grup layout'ları da öyle
  (`app/collections/_layout.tsx:5`, `app/listing/_layout.tsx:8`). Bu ekranlar ne
  `ScreenHeader` kullanıyor ne `useSafeAreaInsets` ne de bir `paddingTop` veriyor:
  - `app/collections/[id]/index.tsx` → gövde `CollectionDetailBody`, kapak görseli
    y=0'dan başlıyor (`app/collections/[id]/_lib/collectionStyles.ts:23-26`).
  - `app/collections/[id]/edit.tsx:52` — `<Stack.Screen options={{ title: … }} />`
    yazılmış ama `headerShown: true` YOK; ebeveyn layout header'ı kapattığı için
    bu başlık **hiç çizilmiyor** ve ekran boşluksuz açılıyor. (Karşılaştırma:
    `app/collections/[id]/add-items/index.tsx:18` bunu doğru yapıyor —
    `headerShown: true` açıkça veriliyor.)
  - `app/listing/[id]/edit.tsx` → `ListingForm`'a devrediyor; o da sabit
    `paddingTop: 50` kullanıyor (bkz. B5).
  - `app/banned.tsx:28`, `app/business-pending.tsx:25` — `headerShown: false` +
    insets yok.
- **Etkilenen:** `app/collections/[id]/index.tsx:14-38`,
  `app/collections/[id]/_lib/collectionStyles.ts:23-26`,
  `app/collections/[id]/edit.tsx:52`, `app/banned.tsx:28`,
  `app/business-pending.tsx:25`, `app/_layout.tsx:147`,
  `app/collections/_layout.tsx:5`
- **Önerilen düzeltme:** Bu ekranlara mevcut `@/ui` `ScreenHeader`'ı ekle (insets'i
  zaten doğru uyguluyor — `src/ui/components/ScreenHeader.tsx:40,48,59`). Kapak
  görselli koleksiyon detayı gibi "header görselin üstünde yüzsün" isteyen
  yerlerde `useSafeAreaInsets().top` ile absolute konumu ver.
  `collections/[id]/edit.tsx:52`'deki `Stack.Screen`'e `headerShown: true` ekle.
- **Şiddet:** Yüksek

### B5: Header içerikleri yeni iPhone'larda saate/çentiğe değiyor, eski cihazlarda fazla boşluklu

- **Belirti:** Ana sayfa, arama, profil, ürün detayı, mesaj başlığı, ilan formu
  ve koleksiyon detayında üst çubuk içeriği cihaza göre bazen çok yukarıda
  (kesik), bazen gereksiz aşağıda duruyor.
- **Kök neden:** `insets.top` yerine sabit `50` yazılmış. Gerçek `insets.top`
  cihaza göre 20 (eski) / 47 (notch) / 59-62 (Dynamic Island) / Android'de
  değişken. Paylaşılan `ScreenHeader` bunu doğru yapıyor, bu 7 yer onu atlıyor.
- **Etkilenen:**
  - `app/(tabs)/_lib/styles.ts:16` (ana sayfa header)
  - `app/(tabs)/_lib/searchStyles.ts:13` (arama header)
  - `app/(tabs)/_lib/profileStyles.ts:16` (profil header)
  - `app/product/[id]/_components/ProductTopBar.tsx:68` (absolute üst çubuk)
  - `app/messages/[threadId]/_lib/styles.ts:14`
  - `src/components/listing/_lib/styles.ts:30` (ilan oluştur/düzenle)
  - `app/collections/[id]/_lib/collectionStyles.ts:29` (`top: 50`)
- **Önerilen düzeltme:** Her birinde `useSafeAreaInsets()` ile
  `paddingTop: Math.max(insets.top, 12)` kullan. Yeni primitive icat etme —
  `ScreenHeader` (`src/ui/components/ScreenHeader.tsx:40-59`) bu hesabı zaten
  yapıyor; mümkün olan yerlerde doğrudan ona geçir.
- **Şiddet:** Orta

### B6: Arama sonuçları ilk karede bir kez yukarı/aşağı sıçrıyor

- **Belirti:** Arama sekmesine girip sonuçlar gelince, ilk ürün satırı bir anlık
  yanlış yerde duruyor ve hemen kayıyor.
- **Kök neden:** Sonuç listesinin üst boşluğu, üstteki absolute arama/filtre
  çubuklarının **tahmini** yüksekliğinden geliyor
  (`COLLAPSIBLE_ESTIMATE = 180`, `app/(tabs)/_lib/searchConstants.ts:10`).
  Gerçek yükseklik `onLayout` ile ölçülüp state'e yazılıyor
  (`app/(tabs)/_hooks/useSearch.ts:117,128`) ve bu değer doğrudan
  `contentContainerStyle.paddingTop`'a besleniyor
  (`app/(tabs)/search.tsx:60`). Ölçüm 180'den farklı çıktığı anda liste yeniden
  yerleşiyor. Ayrıca `isLoading` dalı FlatList'i tamamen ortalanmış bir Spinner
  ile değiştiriyor (`app/(tabs)/search.tsx:48-55`), dönüşte liste sıfırdan
  yerleşiyor.
- **Etkilenen:** `app/(tabs)/search.tsx:48-60`,
  `app/(tabs)/_hooks/useSearch.ts:117,128`,
  `app/(tabs)/_lib/searchConstants.ts:10`
- **Önerilen düzeltme:** Çubuklara ölçülen değil **verilen** bir yükseklik ver
  (stylesheet'te sabit) — o zaman `onLayout` düzeltmesi hiç tetiklenmez. Bu
  mümkün değilse, ilk ölçüm gelene kadar listeyi gizle (mesaj ekranının
  `isPositioned` kalıbı gibi — `MessageList.tsx:135`). Ayrıca `isLoading` dalını
  listeyi sökmeden, `ListEmptyComponent` içinden göster.
- **Şiddet:** Orta

### B7: Sipariş detayında fatura kartları sonradan araya giriyor

- **Belirti:** Sipariş detayını kaydırırken, sayfanın ortasına birden iki fatura
  kartı ekleniyor ve alttaki iptal/iade butonları aşağı kayıyor — yanlış butona
  basma riski.
- **Kök neden:** Fatura verileri ana sipariş query'sinden ayrı, iki bağımsız
  query ile geliyor (`app/orders/[id]/_hooks/useOrderInvoices.ts:23,36`) ve
  kartlar veri gelene kadar hiç yer kaplamıyor
  (`app/orders/[id]/_components/OrderInvoiceCards.tsx:17,51` — `return null`).
  Ekran ise düz bir kart yığını olduğu için araya giren her kart altındakileri
  itiyor (`app/orders/[id]/index.tsx:77-94`).
- **Etkilenen:** `app/orders/[id]/index.tsx:77-94`,
  `app/orders/[id]/_components/OrderInvoiceCards.tsx:17,51`,
  `app/orders/[id]/_hooks/useOrderInvoices.ts:23,36`
- **Önerilen düzeltme:** Fatura kartlarını aksiyon kartlarının **altına** taşı
  (sonradan gelen içerik, dokunulan butonların üstüne değil altına girsin); ya da
  query `isPending` iken kart yüksekliğinde bir iskelet bas.
- **Şiddet:** Orta

### B8: Hiçbir `FlatList`'te `getItemLayout` yok

- **Belirti:** Uzun listelerde hızlı kaydırırken boş alan/beyaz flaş ve kaydırma
  çubuğunun yerinden oynaması; `scrollToIndex` çağrıları güvenilmez.
- **Kök neden:** Repoda 21 `FlatList` var, `getItemLayout` **sıfır** yerde
  geçiyor (`rg -l "getItemLayout" app/ src/` → boş; `scrollToOffset`/`initialScrollIndex`
  terimleriyle de doğrulandı). Sabit yükseklikli olduğu bilinen listelerde bu
  ölçüm maliyetsizce verilebilirdi — örn. arama sonuç ızgarası kart görseli
  `CARD_WIDTH` sabit yükseklikte (`app/(tabs)/_lib/searchStyles.ts:186`) ve
  başlık `numberOfLines={2}` ile sınırlı
  (`app/(tabs)/_components/SearchResultCard.tsx:72`) → satır yüksekliği sabit.
- **Etkilenen:** `app/(tabs)/search.tsx:56-60`,
  `app/(tabs)/_lib/searchStyles.ts:186`, (+19 diğer FlatList)
- **Önerilen düzeltme:** Yalnız gerçekten sabit yükseklikli listelere ekle —
  önce arama ızgarası. Değişken yükseklikli listelerde `getItemLayout` vermek
  düzeltmez, bozar; onlara dokunma.
- **Şiddet:** Orta

### B9: Ana sayfa "hero" görseli dış bir placeholder servisine bağlı

- **Belirti:** Ana sayfadaki tanıtım kutusunda görsel hiç gelmiyor / gri kalıyor.
- **Kök neden:** URL hardcoded ve `via.placeholder.com`'a işaret ediyor —
  üretim ortamında yüklenmesi beklenemez.
- **Etkilenen:** `app/(tabs)/_components/HomeSections.tsx:61-65`
- **Önerilen düzeltme:** Yerel bir asset kullan veya görseli tamamen kaldır.
  (Kayma açısından zararsız: `heroImage` sabit `100x100` —
  `app/(tabs)/_lib/styles.ts:177-180`.)
- **Şiddet:** Düşük

### B10: Kart genişlikleri modül yüklenirken bir kez hesaplanıyor

- **Belirti:** Cihaz döndürüldüğünde veya iPad'de split-view boyutu değişince
  ürün kartları yanlış genişlikte kalıyor, ızgara taşıyor.
- **Kök neden:** `Dimensions.get('window')` modül seviyesinde okunuyor, boyut
  değişimine abone olunmuyor.
- **Etkilenen:** `app/(tabs)/_lib/searchConstants.ts:4-6` (`CARD_WIDTH`),
  `app/product/[id]/_components/ProductGallery.tsx:6,56`,
  `app/collections/[id]/_lib/collectionStyles.ts:23-26`
- **Önerilen düzeltme:** `useWindowDimensions()` ile bileşen içinde hesapla.
  Uygulama yalnız portre kilitliyse (app.json'da doğrula) bu bulgu düşürülebilir.
- **Şiddet:** Düşük

---

## Temiz çıkan eksenler (kanıtla)

- **Modal + insets:** `@/ui` Modal ortalanmış bir sheet
  (`src/ui/components/Modal.tsx:58-71`) — üst/alt kesime girmiyor, insets
  gerekmiyor. `KeyboardAvoidingView` + `Platform` ayrımı doğru (`:36-37`), yani
  `offers/_modals/*` gibi kendi `KeyboardAvoidingView`'i olmayan modaller bunu
  ücretsiz alıyor. Tutarsızlık bulunmadı.
- **Klavye:** `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` 9 yerde
  birebir aynı yazılmış (`src/components/listing/ListingForm.tsx:51`,
  `app/checkout/index.tsx:37`, `app/messages/[threadId]/index.tsx:20`,
  `app/support/[id].tsx:153`, `app/newsletter/{index,unsubscribe}.tsx`,
  `src/ui/components/{Modal,Screen}.tsx`). Eksik kalan dosyalar ya test dosyası
  ya da ebeveyni zaten `KeyboardAvoidingView` ile sarılmış alt-bileşen
  (`MessageInputBar.tsx`, `NewMessageBody.tsx`, `offers/_modals/*`).
- **Tab bar alt boşluğu:** `AppTabBar` absolute değil, `Tabs`'ın `tabBar` prop'u
  ile normal akışta çiziliyor (`app/(tabs)/_layout.tsx:20`) ve alt inset'i kendisi
  ekliyor (`app/(tabs)/_components/AppTabBar.tsx:34,40`). Ekran içeriğiyle
  çakışma yok — ana sayfa ayrıca sonda 100pt tampon bırakıyor
  (`app/(tabs)/index.tsx:99`).
- **Çift header:** `ScreenHeader` kullanan 40 ekranın hiçbirinde görünür
  `Stack.Screen` header'ı yok. Tek `headerShown: true`
  (`app/collections/[id]/add-items/index.tsx:18`) `ScreenHeader` kullanmıyor.
  Çift üst boşluk bulunamadı.

---

## Tekrarlayan kök nedenler

1. **"Veri yoksa hiç yer kaplama" kalıbı (`return null`)** — B1, B7'nin ortak
   kaynağı; 8 ayrı yerde. Doğru davranış: veri **beklenirken** yer ayır, veri
   **kesin olarak yokken** kaldır. Ayrım `data.length === 0` ile değil,
   `isPending` ile yapılmalı.
2. **`isLoading` dalının içerikten farklı yükseklikte olması** — B2, B6. Üç dalı
   (loading/empty/content) ortak bir `minHeight` sarmalayıcısına almak yeterli.
3. **Safe-area'nın elle `50` diye yazılması** — B4, B5; 7 dosya. Paylaşılan
   `ScreenHeader` (`src/ui/components/ScreenHeader.tsx:40-59`) bunu zaten doğru
   çözüyor; **yeni bir primitive'e ihtiyaç yok**, çağrı yerlerini ona veya
   `useSafeAreaInsets`'e taşımak gerekiyor.
4. **Root `headerShown: false` varsayılanı** (`app/_layout.tsx:147`) — bir ekran
   üst boşluğu düşünmeyi unuttuğunda sessizce çentiğin altında açılıyor; hata
   fark edilmiyor. Lint kuralı ya da varsayılanı `ScreenHeader` zorunlu kılan bir
   şablon düşünülebilir.

## Önerilen uygulama sırası

Şiddet × efor sırasıyla:

1. **B5 + B4 (safe area)** — mekanik, düşük riskli, 7 + 5 dosya. En görünür
   kalite sıçraması. Tek oturumda biter.
2. **B1 (AdBanner placeholder)** — tek dosya, tek koşul değişikliği; ana sayfanın
   en can sıkıcı zıplamasını götürür.
3. **B3 (mesaj scrollToEnd koşulu)** — tek fonksiyon (`useMessageThread.ts:73-83`),
   ama davranışsal; elle test şart.
4. **B2 (Popüler İlanlar minHeight)** — tek section + stylesheet.
5. **B7 (fatura kartlarını aşağı taşı)** — kart sırasını değiştirmek yeterli.
6. **B6 (arama header yüksekliği)** — `useSearch` scroll/collapse mantığına
   dokunuyor, en riskli; sona bırak.
7. **B8, B9, B10** — fırsat buldukça; kullanıcı etkisi sınırlı.
