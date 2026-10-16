import { useEffect, useMemo, useRef } from 'react';
import { Keyboard } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirm, toast } from '@/ui';
import { useZodForm } from '@/ui/form';
import { bankAccountApi, errorText } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useRequireLegalIdentity } from '@/hooks/useLegalIdentity';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { useScreenFocused } from '@/ui/lib/screenFocus';
import { formatIbanDisplay } from '@/utils/iban';
import { buildBankAccountSchema, EMPTY_BANK_ACCOUNT, type BankAccountForm } from '../_lib/schema';
import { sameBankAccountPayload, toBankAccountPayload } from '../_lib/payload';

/**
 * Banka hesabı ekranının kontrolcüsü: hesap sorgusu, form, kaydet/sil
 * mutasyonları ve toast bildirimleri. Kaydetmeden ÖNCE yasal kimlik istenir (B-2.4,
 * ihtiyaç anında): hesap satıcı ödemesi içindir ve devlet bildirimi için
 * üyenin kimliği kayıtlı olmalıdır. Üye kimlik adımında vazgeçerse kayıt
 * yapılmaz.
 *
 * Kimlik adımı uzun süre açık kalabilir: kapandığında ekran artık bağlı
 * değilse kayıt gitmez; form bu arada değiştiyse (ör. hesap sorgusu yenilenip
 * formu sıfırladı) eski değerler GÖNDERİLMEZ, üyeden Kaydet'e yeniden basması
 * istenir — IBAN paranın gideceği yer, gördüğü değerden başkası kaydedilmemeli.
 *
 * Geri bildirim: başarıda klavye kapanır, toast çıkar ve ekran kayıtlı özet kartını
 * gösterir. İlan formunun IBAN kapısından (`?from=listing`) gelindiyse kayıttan sonra
 * kendiliğinden geri dönülür (kapı aynı sorgu anahtarını okuduğu için açılır); Ayarlar'dan
 * gelindiyse ekranda kalınır.
 */
export function useBankAccount() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const returnToListing = from === 'listing';
  const { requireIdentity, isChecking: checkingIdentity } = useRequireLegalIdentity();
  // Dil değişince şema yeniden kurulur — aksi halde hata metni ilk dilde donar.
  const schema = useMemo(() => buildBankAccountSchema(t), [t]);
  const form = useZodForm(schema, { defaultValues: EMPTY_BANK_ACCOUNT });
  const { reset, getValues } = form;
  const mounted = useRef(true);
  const focusedRef = useRef(true);
  focusedRef.current = useScreenFocused();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const accountQuery = useQuery({
    queryKey: qk.user.bankAccount,
    queryFn: async () => (await bankAccountApi.get()).data || null,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const acc = accountQuery.data;
    if (acc) {
      reset({
        accountHolder: acc.accountHolder || '',
        iban: formatIbanDisplay(acc.iban || ''),
        taxId: acc.taxId || '',
      });
    }
  }, [accountQuery.data, reset]);

  const upsertMutation = useMutation({
    mutationFn: async (data: BankAccountForm) => bankAccountApi.upsert(toBankAccountPayload(data)),
    onSuccess: (res) => {
      // PATCH yanıtı GET ile aynı şekil: önbelleğe HEMEN yaz — ilan formundaki IBAN kapısı
      // (aynı anahtar) geri dönüşte eski `null` ile "IBAN ekleyin" göstermesin, özet kart
      // güncel olsun. Sonra sunucudan tazele.
      queryClient.setQueryData(qk.user.bankAccount, res.data || null);
      queryClient.invalidateQueries({ queryKey: qk.user.bankAccount });
      Keyboard.dismiss();
      toast.success(t('bankAccount.saved'));
    },
    onError: (error) =>
      toast.error(errorText(error, t('bankAccount.saveFailed')).split('\n')[0]!),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => bankAccountApi.remove(),
    onSuccess: () => {
      queryClient.setQueryData(qk.user.bankAccount, null);
      queryClient.invalidateQueries({ queryKey: qk.user.bankAccount });
      reset(EMPTY_BANK_ACCOUNT);
      toast.success(t('bankAccount.deleted'));
    },
    onError: (error) => toast.error(errorText(error, t('bankAccount.deleteFailed'))),
  });

  const save = async (data: BankAccountForm) => {
    // Kimlik kontrolü sürerken buton "kaydediliyor" (`checkingIdentity`).
    const proceed = await requireIdentity();
    if (!mounted.current) return;
    if (!proceed) {
      // Oturum kapanınca da `false` döner; o durumda "kimlik gerekli" demek yanlış olur.
      if (useAuthStore.getState().isAuthenticated) toast(t('bankAccount.identityRequired'));
      return;
    }
    if (!sameBankAccountPayload(data, getValues())) {
      toast(t('bankAccount.resubmitAfterIdentity'));
      return;
    }
    // Geri dönüş çağrı seviyesinde: kullanıcı PATCH sürerken ekrandan çıktıysa (ya da üstüne başka
    // ekran açıldıysa) fazladan bir ekran atılmaz.
    upsertMutation.mutate(data, {
      onSuccess: () => {
        if (returnToListing && mounted.current && focusedRef.current) goBackOrHome();
      },
    });
  };

  const confirmDelete = async () => {
    const ok = await confirm({
      title: t('bankAccount.deleteTitle'),
      message: t('bankAccount.deleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('discount.discard'),
      destructive: true,
    });
    if (ok) deleteMutation.mutate();
  };

  return {
    isAuthenticated,
    form,
    existing: !!accountQuery.data,
    account: accountQuery.data ?? null,
    /** Yalnız ilk yükleme: yenilemede (refetch) form sökülmez. */
    isLoading: accountQuery.isPending,
    /** Okuma hatası; elde veri (hesap yok = `null` dahil) varsa form korunur. */
    loadError: accountQuery.isError && accountQuery.data === undefined ? accountQuery.error : null,
    refetch: accountQuery.refetch,
    onSubmit: form.handleSubmit(save),
    isSaving: checkingIdentity || upsertMutation.isPending,
    confirmDelete,
  };
}
