# İlan Formu Sözleşmesi (Tasarım)

**Tarih:** 2026-08-10
**Kaynak:** `mobile-parity docs/18-api-delta-2026-08-07.md` §2 (a–e)
**Ana repo:** `sigmoida/tarodan-app` `development` @ `cfc058da` (2026-08-07)
**Backlog:** `docs/PARITE_KALAN_ISLER.md` → P1 #2, P1 #3, P2 #6, #7, #8

## Amaç

İlan oluşturma/düzenleme formunu backend'in yeni sözleşmesine getirmek. Bugün
düzenleme formu ürünün **gösterim** projeksiyonundan dolduruluyor; sunucu ise
kayda geri yazılabilir ham değerleri ayrı bir `edit` bloğunda veriyor. Fark,
satıcının dokunmadığı alanların sessizce değişmesine yol açıyor.

## Kapsam

**İçinde:**

1. Düzenleme formu tek kaynağa iner: `edit` projeksiyonu (P1 #2)
2. Görsel sözleşmesi — key sahipliği, sıra, kuyruk kapısı, `409` (P1 #3, **sözleşme düzeyi**)
3. `carModelId` + `modelCode` opsiyonel (P2 #6)
4. Yeni ilan indirimli açılabilir (P2 #7)
5. `relatedOrder` / `relatedTrade` (P2 #8)

**Dışında:** sürükle-bırak sıralama, kapak seçim UI'ı (bilinçli karar — sunucunun
dayattığı sözleşme önce), bildirim resolver'ı, kargo akışı, kurumsal satış yetkisi.

## Ölçüm (staging, 2026-08-10)

Sözleşme dokümandan değil canlıdan doğrulandı. `GET /products/my/:id`:

- `edit` bloğu **tam** — dokümandaki 29 alanın 29'u geliyor.
- `Cache-Control: no-store, no-cache, must-revalidate` — doğrulandı.
- `edit.shippingPackageTier: "small"` geliyor → **"sunucu kademeyi döndürmüyor"
  varsayımı artık yanlış.**
- Dokümanda yazmayan **kolaylık alanları**: `brandName`, `brandSlug`,
  `carModelName`, `categoryName`, `manufacturerName`, `manufacturerSlug`.
- `edit.attributes` üretici-**bağımsız** nitelikleri de taşıyor
  (`scale` → `manufacturerSlug: null`).
- `edit.images[]`: `cardKey`, `detailKey`, `cardUrl`, `detailUrl`, `sortOrder`.

**`edit` "her şey" DEĞİL.** İki alan orada yok, ölçüldü: `isPreorder` ve
`availableQuantity` (rezerve adet hesabı için gerekli). İkisi üst seviyeden
okunmaya devam eder.

> **Sözleşme:** Kayda **geri yazılan** her alan `edit`'ten gelir; `edit`'in
> taşımadığı iki türetme (`isPreorder`, rezerve adet) üst seviyeden.

## 1. Prefill — saf bir eşleyici

Bugün prefill, 868 satırlık `useListingForm.ts` içinde ~120 satırlık bir
`useEffect` bloğu; sözleşmesi render olmadan test edilemiyor.

```ts
// src/components/listing/_lib/editMapper.ts
export function toFormValues(p: MyProductResponse): {
  values: ListingFormValues;                       // şema alanları
  images: { keys: ImageKey[]; uris: string[] };
  attrs: Record<string, string[]>;                 // groupSlug → [slug]
  sale: { salePrice: string; saleStartDate: string; saleEndDate: string };
  reservedQty: number;
  labels: {
    brandName: string; carModelName: string;
    categoryName: string; manufacturerName: string;
  };
};
```

`useEffect` yalnız çağırır ve state'e yazar. Hook ~90 satır küçülür. **Hook bu
turda daha fazla bölünmez** — dokunulan iş bunu gerektirmiyor.

### Eşleyicinin içindeki üç davranış değişikliği

**İndirim çifti.** Bugün `p.isOnSale && p.oldPrice > p.price` üst seviyeden
okunuyor. Kanonik çift `edit.price` + `edit.oldPrice`'tır: `oldPrice > price` ise
formun normal fiyatı `oldPrice`, indirimli fiyatı `price`. `edit.salePrice`
geriye uyum alanıdır ve **tek başına otorite değildir**.

**Nitelikler.** `a?.manufacturerSlug &&` filtresi kalkar; `edit.attributes`'ın
tamamı alınır. `scale` ve `material` artık üst seviyeden değil bu diziden gelir —
iki kaynak biter.

**Etiketler.** `brandName`/`carModelName`/`categoryName`/`manufacturerName`
eşleyiciden geçer; form açılışta boş etiket göstermez (bugün marka/model
listeleri yüklenene kadar bekliyor).

### `_lib/payload.ts` silinir

20 satırlık `buildTierPayloadField`, "sunucu kademeyi geri döndürmüyor"
varsayımı üzerine kurulmuş bir workaround. Varsayım artık yanlış. Workaround
kalırsa satıcının kademeyi **bilerek** değiştirmesi sessizce yok sayılır — yani
düzeltilen hatanın simetriği. `shippingPackageTier` koşulsuz gönderilir; alan
prefill'den hep dolu geldiği için boş gönderilmesi de imkânsızlaşır.

`validate.ts`'teki "düzenlemede kademe zorunlu değil" istisnası da gerekçesini
kaybeder ve kalkar.

## 2. Görsel sözleşmesi

Kodda dört somut boşluk var:

| Bugün | Sorun | Düzeltme |
| --- | --- | --- |
| `ListingSections.tsx:166` — `uploadingImages` yalnız **seçiciyi** kapatıyor | Kaydet butonu yükleme sürerken açık; yarım `images[]` gönderilebilir | Kaydet de kuyruk bitene kadar kapalı |
| `newPreviewUrls[i] \|\| a.uri` | Yükleme URL dönmezse **yerel geçici URI** saklanıyor | API'nin `cardUrl`/`detailUrl`'ü esas; dönmediyse yükleme başarısız sayılır |
| Prefill'de `cardKey: i.cardKey ?? i.url` | **URL'den key türetme** — §2d bunu açıkça yasaklıyor | `edit.images` her ikisini de taşıyor; fallback silinir. Key yoksa görsel atlanır, uydurulmaz |
| `409` sonrası davranış tanımsız | İyimser kilit çakışmasında form kaydedilmiş sanılıyor | Kaydı yeniden çek, çakışmayı göster, formu kaydedilmiş sayma |

**`images: undefined` dalı sorun değil.** `validate.ts:29` sıfır görsele izin
vermiyor, yani "boş dizi listeyi temizler" davranışı mobilde erişilemez.
Dokümanda geçiyor diye kod eklenmez.

**Sıra sözleşmesi zaten karşılanıyor** (`imageKeys` dizisi kanonik, indeks
`sortOrder`, ilk eleman kapak). Bu turda yeniden sıralama UI'ı yok; kural bir
testle kilitlenir ki ileride sessizce bozulmasın.

## 3. Opsiyonel alanlar

`carModelId` ve `modelCode` zorunluluktan çıkar (§2a). Şemada
`carModelId: z.string()` kalır (boş string geçerli); zorunluluk `validate.ts`'te
varsa kalkar. Temizleme: `carModelId: null`, model kodu için boş string.

**`modelCode` forma eklenir.** Bugün form bu alanı hiç tutmuyor ama
`edit.modelCode` doluyor (`"SEED-0057"` ölçüldü) — yani düzenlemede sessizce
kayboluyor.

## 4. Oluşturmada indirim

Bugün indirim alanları yalnız `isEdit` dalında gönderiliyor; `POST /products`
artık `originalPrice` / `salePrice` / `saleStartDate` / `saleEndDate` kabul
ediyor (§2b). Aynı `hasSale` mantığı iki dala da uygulanır.

Etkin fiyat istemcide **türetilmez** — ürün/quote yanıtındaki `price`,
`oldPrice`, `isOnSale` esastır.

## 5. `relatedOrder` / `relatedTrade`

`GET /products/my` satırlarında geliyorsa satılmış/rezerve ilan aksiyonu
bunlardan okunur (§2e), tahminî bir `orderId`'den veya son yerel işlemden değil.

**Ölçülmedi.** Plan bunu bir kapı adımı olarak taşır: alan staging'de yoksa madde
düşer ve backend beklemesi olarak raporlanır.

## Test

Ağırlık saf eşleyicide — bu turun asıl kazancı, sözleşmenin render olmadan test
edilebilir hale gelmesi.

**`toFormValues`** (ölçülmüş gerçek gövdeyle):
- indirimli ürün → `oldPrice > price` normal/indirimli doğru ayrışıyor
- indirimsiz ürün
- `edit.salePrice` dolu ama `oldPrice` boş → geriye uyum alanı tek başına otorite değil
- `shippingPackageTier` prefill ediliyor
- `modelCode` taşınıyor
- `attributes` üretici-bağımsız olanları da içeriyor
- `isPreorder` ve rezerve adet üst seviyeden geliyor

**Görsel:**
- prefill'de URL-key fallback'i yok (key yoksa görsel atlanır)
- yükleme sürerken kaydet kapalı
- `409`'da form kaydedilmiş sayılmıyor

**Payload:**
- `shippingPackageTier` koşulsuz gönderiliyor
- oluşturmada indirim alanları gidiyor
- `carModelId` boşken istek reddedilmiyor

## Teslim sırası

| # | Adım |
| - | ---- |
| 0 | `GET /products/my` ölçümü — `relatedOrder`/`relatedTrade` var mı? **Kapı** |
| 1 | `toFormValues` eşleyicisi + testleri (saf, ekrana dokunmadan) |
| 2 | Prefill'i eşleyiciye bağla, `_lib/payload.ts` sil, kademe koşulsuz gönderilsin |
| 3 | `modelCode` alanı + `carModelId` zorunluluğunun kalkması |
| 4 | Görsel: kaydet kapısı, URL-key fallback'inin kaldırılması, `409` davranışı |
| 5 | Oluşturmada indirim |
| 6 | `relatedOrder`/`relatedTrade` (0. adım geçtiyse) |

## Riskler

- **Sessiz veri kaybının yönü değişiyor.** Bugün kademe *gönderilmiyor*
  (sunucudaki değer korunuyor); yarın *gönderiliyor*. Prefill bir alanı yanlış
  okursa satıcı dokunmadığı bir alanı yazmış olur. Bu yüzden 1. adım saf ve
  testli, 2. adım ondan sonra gelir.
- **`edit` ile üst seviye arasında kayma.** İkisi aynı üründen türer ama farklı
  projeksiyonlardır. Kural tek yerde (eşleyici) tutulur.
- **868 satırlık hook.** Bu turda bölünmez; yalnız prefill çıkar.
- **0. adım bir maddeyi düşürebilir** (`relatedOrder`) — bu bir kapı, süsleme değil.

## Doğrulama (CLAUDE.md §13)

- `npx tsc --noEmit` — takip edilen temel dışında yeni hata yok
- `pnpm --filter @tarodan/mobile lint` temiz
- `npx jest` yeşil (şu an 173 suite / 1398 test)
- Metro'da elle: ilan düzenlemede bir alanı değiştir, kaydet, **dokunulmayan
  alanların değişmediğini** doğrula (özellikle kargo paket kademesi)
