import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { GLASS_ICON_BUTTON_SIZE, GlassSurface, Input, theme, Icon, type RawTextInput } from '@/ui';
import { styles } from '../_lib/searchStyles';

const { colors } = theme;

/** Yazma bittikten sonra onaylanmış sorgunun üst bileşene yazılma gecikmesi. */
const DEBOUNCE_MS = 400;

export interface SearchInputBoxProps {
  /** Açılıştaki metin (URL `q` parametresi). */
  initialValue: string;
  /** Dışarıdan kutuyu doldurma komutu (öneri/son arama seçimi, temizle); `nonce` her komutta artar. */
  command: { text: string; nonce: number } | null;
  /**
   * Kutuya otomatik odaklan — ama `ready` olunca (geçiş animasyonu bittikten sonra): klavyenin
   * açılış animasyonu sayfa geçişiyle üst üste binip ekranı takılır göstermesin.
   */
  autoFocus: boolean;
  /** Geçiş bitti mi (`useTransitionReady`); verilmezse hemen hazır sayılır. */
  ready?: boolean;
  /** Öneri paneli açıkken kapat düğmesi çıkar. */
  suggestionsOpen: boolean;
  /** Debounce sonrası onaylanmış (kırpılmamış) metin. */
  onCommit: (text: string) => void;
  /** Kutu boş/dolu durumu değiştiğinde (son aramalar paneli yalnız boşken görünür). */
  onEmptyChange: (empty: boolean) => void;
  /** Klavyede arama/Enter: kullanıcı aramayı onayladı. */
  onSubmit: (text: string) => void;
  onClose: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

/**
 * Arama kutusu — üst barın ortasında (PageShell `titleSlot` + `titleFill`), ana sayfadaki arama
 * alanıyla AYNI cam hap (`GlassSurface`, cam düğme çapı). Metin state'i BURADA: her tuş yalnızca bu
 * küçük bileşeni render eder; ekran, liste ve çubuklar yalnız debounce sonrası `onCommit` ile
 * haberdar olur.
 */
function SearchInputBoxBase({
  initialValue,
  command,
  autoFocus,
  ready = true,
  suggestionsOpen,
  onCommit,
  onEmptyChange,
  onSubmit,
  onClose,
  onFocus,
  onBlur,
}: SearchInputBoxProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialValue);
  const inputRef = useRef<React.ComponentRef<typeof RawTextInput>>(null);

  // Programatik odak (prop `autoFocus` DEĞİL): yalnız geçiş bittikten sonra, bir kez.
  useEffect(() => {
    if (autoFocus && ready) inputRef.current?.focus();
  }, [autoFocus, ready]);

  useEffect(() => {
    if (command) setText(command.text);
  }, [command]);

  useEffect(() => {
    onEmptyChange(!text);
  }, [text, onEmptyChange]);

  useEffect(() => {
    const id = setTimeout(() => onCommit(text), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text, onCommit]);

  return (
    <GlassSurface shape="pill" size={GLASS_ICON_BUTTON_SIZE} style={styles.headerField} testID="search-input-surface">
      <Input
        testID="search-input"
        inputRef={inputRef}
        placeholder={t('search.placeholderLong')}
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => onSubmit(text)}
        returnKeyType="search"
        // Üst bardaki cam düğmelerle aynı renk (GlassIconButton `heading`): ikon + placeholder.
        leftIcon={<Icon name="magnifying-glass" size={theme.iconSize.md} color={colors.text.heading} />}
        placeholderTextColor={colors.text.heading}
        containerStyle={styles.headerInputContainer}
        fieldStyle={styles.headerInputField}
        rightIcon={
          suggestionsOpen ? (
            <Pressable
              onPress={onClose}
              hitSlop={theme.spacing[3]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Icon name="x-circle" variant="solid" size={theme.iconSize.md} color={colors.text.muted} />
            </Pressable>
          ) : undefined
        }
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </GlassSurface>
  );
}

export const SearchInputBox = React.memo(SearchInputBoxBase);
