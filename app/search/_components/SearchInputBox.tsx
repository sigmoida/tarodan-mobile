import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { Input, theme, Icon } from '@/ui';
import { styles } from '../_lib/searchStyles';

const { colors } = theme;

/** Yazma bittikten sonra onaylanmış sorgunun üst bileşene yazılma gecikmesi. */
const DEBOUNCE_MS = 400;

export interface SearchInputBoxProps {
  /** Açılıştaki metin (URL `q` parametresi). */
  initialValue: string;
  /** Dışarıdan kutuyu doldurma komutu (öneri/son arama seçimi, temizle); `nonce` her komutta artar. */
  command: { text: string; nonce: number } | null;
  autoFocus: boolean;
  /** Öneri paneli açıkken kapat düğmesi çıkar ve alt köşeler düzleşir. */
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
 * Arama kutusu — metin state'i BURADA. Her tuş yalnızca bu küçük bileşeni render eder; ekran,
 * liste ve çubuklar yalnız debounce sonrası `onCommit` ile haberdar olur.
 */
function SearchInputBoxBase({
  initialValue,
  command,
  autoFocus,
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
    <Input
      testID="search-input"
      autoFocus={autoFocus}
      placeholder={t('search.placeholderLong')}
      value={text}
      onChangeText={setText}
      onSubmitEditing={() => onSubmit(text)}
      leftIconName="magnifying-glass"
      containerStyle={styles.searchInputContainer}
      fieldStyle={suggestionsOpen ? [styles.searchInputField, styles.searchInputFieldOpen] : styles.searchInputField}
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
  );
}

export const SearchInputBox = React.memo(SearchInputBoxBase);
