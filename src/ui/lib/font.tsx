import React, { createContext, useContext } from 'react';
import type { TextStyle } from 'react-native';
import { bodyLetterSpacing, brandFontStyle } from '@/theme';

/**
 * Marka fontu (Noto Sans) yüklendi mi? Kök layout `useFonts` sonucunu buradan verir.
 *
 * Bayrak bir modül değişkeni değil CONTEXT: ekranlar font yüklenmeden (splash altında)
 * çizilebilir; yükleme bitince değer değişir ve yalnız bu context'i okuyan metin
 * bileşenleri yeniden çizilir (memo'lu ebeveynler engel olmaz). Sağlayıcı yoksa (test,
 * yükleme hatası) `false` → sistem fontu, mevcut görünüm.
 */
const BrandFontContext = createContext(false);

export const BrandFontProvider: React.FC<{ ready: boolean; children: React.ReactNode }> = ({
  ready,
  children,
}) => <BrandFontContext.Provider value={ready}>{children}</BrandFontContext.Provider>;

export function useBrandFont(): boolean {
  return useContext(BrandFontContext);
}

/** İç içe metinde ebeveynin çözülmüş ağırlık/boyut/ailesi (RN bunları miras verir). */
interface TextInherit {
  weight?: TextStyle['fontWeight'];
  fontSize?: number;
  family?: string;
  fontStyle?: TextStyle['fontStyle'];
}

const TextInheritContext = createContext<TextInherit | null>(null);

/** RN `Text`'in varsayılan boyutu — stil boyut vermezse harf aralığı buna göre. */
const RN_DEFAULT_FONT_SIZE = 14;

/**
 * Düzleştirilmiş metin stiline marka fontunu uygular: ağırlık → Noto Sans dosyası
 * (`brandFontStyle`), gövde harf aralığı (web -0.01em). İç içe metinde ağırlığı ebeveynden
 * alır; aksi halde kalın bir ebeveynin içindeki düz `<Text>` kendi 400 dosyasını seçip
 * kalınlığı kaybederdi.
 *
 * Döner: [eklenecek stil (yoksa null), çocuklara verilecek miras].
 */
export function useBrandTextStyle(flat: TextStyle): [TextStyle | null, TextInherit] {
  const enabled = useBrandFont();
  const parent = useContext(TextInheritContext);
  const weight = flat.fontWeight ?? parent?.weight;
  const family = flat.fontFamily ?? parent?.family;
  const fontSize = flat.fontSize ?? parent?.fontSize;
  const fontStyle = flat.fontStyle ?? parent?.fontStyle;
  const inherit: TextInherit = { weight, fontSize, family, fontStyle };
  if (!enabled) return [null, inherit];

  const font = brandFontStyle(true, weight, family, fontStyle);
  const needsSpacing = flat.letterSpacing == null && (flat.fontSize != null || !parent);
  const letterSpacing = needsSpacing
    ? bodyLetterSpacing(true, fontSize ?? RN_DEFAULT_FONT_SIZE)
    : undefined;
  if (!font && letterSpacing == null) return [null, inherit];
  return [{ ...(font ?? {}), ...(letterSpacing != null ? { letterSpacing } : {}) }, inherit];
}

/** Çocuklarda element varsa miras context'i ile sarar (salt metinde ek düğüm yok). */
export function withTextInherit(children: React.ReactNode, inherit: TextInherit): React.ReactNode {
  const onlyPrimitive = React.Children.toArray(children).every(
    (c) => typeof c === 'string' || typeof c === 'number',
  );
  if (onlyPrimitive) return children;
  return <TextInheritContext.Provider value={inherit}>{children}</TextInheritContext.Provider>;
}
