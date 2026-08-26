import { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appAlert } from "@/ui";
import {
  DEFAULT_COUNTRY_CODE,
  isValidPhoneInput,
  parsePhoneForPayload,
  PHONE_INVALID_MESSAGE,
  splitPhone,
} from "@/utils/phone";
import { useRefresh } from "@/hooks/useRefresh";
import { api } from "@/lib/api";
import { qk } from "@/lib/query";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "react-i18next";
import { EMPTY_FORM, type Address, type AddressForm } from "../_lib/types";

/**
 * Addresses controller — owns the addresses query, save/delete/set-default
 * mutations, the form + field-error state, and the open/edit/delete/submit
 * handlers. Lifted verbatim from the monolithic AddressesScreen.
 */
export function useAddresses() {
  const { t } = useTranslation();
  const { isAuthenticated, limits } = useAuthStore();
  const queryClient = useQueryClient();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressForm>(EMPTY_FORM());
  // Alan-bazlı görünür validasyon — boş/geçersiz alanlar kırmızı çerçeve + alt mesaj alır.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const maxAddresses = limits?.maxAddresses || 10;

  // Fetch addresses
  const {
    data: addressesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: qk.user.addresses,
    queryFn: async () => {
      try {
        const response = await api.get("/users/me/addresses");
        return response.data?.data || response.data || [];
      } catch (error) {
        console.log("Failed to fetch addresses");
        return [];
      }
    },
    enabled: isAuthenticated,
  });

  const addresses: Address[] = addressesData || [];

  const { refreshing, onRefresh } = useRefresh(refetch);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refetch();
      }
    }, [isAuthenticated]),
  );

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AddressForm) => {
      // API CreateAddressDto `zipCode` bekliyor (postalCode değil) — eşle, yoksa posta kodu kaybolur.
      // phoneCountryCode DTO'da yok; telefonu "+90…" olarak normalize edip payload'dan çıkar.
      const { postalCode, phoneCountryCode, ...rest } = data;
      // EMNİYET KEMERİ: `handleSubmit` zaten geçirmiyor, ama çözülemeyen numara
      // buradan ASLA sessizce (kırpılmış/uydurulmuş olarak) çıkmasın — kargo
      // telefonu bu; yanlışı göndermektense gönderimi durdurup hata göster.
      const phone = parsePhoneForPayload(data.phone, phoneCountryCode);
      if (!phone) {
        const invalid: any = new Error(PHONE_INVALID_MESSAGE);
        invalid.isClientValidation = true;
        throw invalid;
      }
      const payload = {
        ...rest,
        phone,
        zipCode: postalCode,
      };
      if (editingAddress) {
        return api.patch(`/users/me/addresses/${editingAddress.id}`, payload);
      } else {
        return api.post("/users/me/addresses", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.user.addresses });
      setDialogVisible(false);
      resetForm();
      appAlert(
        t("common.success"),
        editingAddress ? t("address.updated") : t("address.added"),
      );
    },
    onError: (err: any) => {
      // Client-side telefon reddi ağ hatası değil — kendi Türkçe mesajını göster.
      if (err?.isClientValidation) {
        setFieldErrors((prev) => ({ ...prev, phone: err.message }));
        appAlert("Hata", err.message);
        return;
      }
      const msg = err?.response?.data?.message;
      appAlert(
        "Hata",
        Array.isArray(msg) ? msg.join("\n") : msg || t("address.saveFailed"),
      );
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (addressId: string) => {
      return api.delete(`/users/me/addresses/${addressId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.user.addresses });
      appAlert(t("common.success"), t("address.deleted"));
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      appAlert(
        "Hata",
        Array.isArray(msg) ? msg.join("\n") : msg || t("address.deleteFailed"),
      );
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (addressId: string) => {
      return api.patch(`/users/me/addresses/${addressId}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.user.addresses });
    },
  });

  const resetForm = () => {
    setFormData(EMPTY_FORM());
    setEditingAddress(null);
    setFieldErrors({});
  };

  // Kullanıcı bir alanı düzeltmeye başlayınca o alanın hatasını anında kaldır.
  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const openAddDialog = () => {
    if (addresses.length >= maxAddresses) {
      appAlert(
        t("address.limitTitle"),
        t("address.limitBody", { max: maxAddresses }),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("address.goPremium"), onPress: () => router.push("/upgrade") },
        ],
      );
      return;
    }
    resetForm();
    setDialogVisible(true);
  };

  const openEditDialog = (address: Address) => {
    setEditingAddress(address);
    const { countryCode, phone } = splitPhone(address.phone);
    setFormData({
      title: address.title,
      fullName: address.fullName,
      phone,
      phoneCountryCode: countryCode,
      address: address.address,
      city: address.city,
      district: address.district,
      postalCode: address.zipCode ?? address.postalCode ?? "",
      isDefault: address.isDefault,
    });
    setDialogVisible(true);
  };

  const handleDelete = (address: Address) => {
    appAlert(
      t("address.deleteAddress"),
      t("address.deleteConfirmNamed", { title: address.title }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteMutation.mutate(address.id),
        },
      ],
    );
  };

  const handleSubmit = () => {
    // Alan-bazlı görünür validasyon — her hatalı alan kırmızı çerçeve + alt mesaj alır.
    // API DTO kuralları (adres ≥10 karakter, telefon ≥10 hane) client'ta önden uygulanır;
    // yoksa backend ham 400 "Adres kaydedilemedi" döner.
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = t("validation.required");
    if (!formData.fullName.trim()) errors.fullName = t("validation.required");
    if (!formData.phone.trim()) errors.phone = t("validation.required");
    // Sıkı TR ayrıştırma — kırpma/tahmin yok, `@/utils/phone` TEK KAYNAK.
    // TR dışı kodlar için ayrı bir "≥10 hane" dalı VARDI; kaldırıldı: sunucu
    // artık yalnız `+905…` kabul ediyor (`IsTrPhone`, staging 2026-08-26) ve
    // `isValidPhoneInput` TR dışı her kodda zaten `false` dönüyor. Dal ölüydü
    // ve okuyana "yabancı numara destekleniyor" izlenimi veriyordu.
    else if (!isValidPhoneInput(formData.phone, formData.phoneCountryCode))
      errors.phone = PHONE_INVALID_MESSAGE;
    if (!formData.address.trim()) errors.address = t("validation.required");
    else if (formData.address.trim().length < 10)
      errors.address = t("validation.minLength", { min: 10 });
    if (!formData.city) errors.city = t("validation.required");
    if (!formData.district) errors.district = t("validation.required");

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Hatalı alan, kaydırmalı modalda ekran dışında kalabilir → kısa özet alert de göster.
      const hasMissing =
        !formData.title ||
        !formData.fullName ||
        !formData.phone ||
        !formData.address ||
        !formData.city ||
        !formData.district;
      if (hasMissing) {
        appAlert(t("common.error"), t("address.fillRequiredFields"));
      } else if (errors.address) {
        appAlert(t("common.error"), t("address.addressMinLength"));
      } else {
        // Alanın altındaki mesajla AYNI metin — iki yerde iki farklı kural anlatılmasın.
        appAlert("Hata", errors.phone ?? PHONE_INVALID_MESSAGE);
      }
      return;
    }

    saveMutation.mutate(formData);
  };

  return {
    t,
    isAuthenticated,
    addresses,
    maxAddresses,
    isLoading,
    refreshing,
    onRefresh,
    dialogVisible,
    setDialogVisible,
    editingAddress,
    formData,
    setFormData,
    fieldErrors,
    clearFieldError,
    openAddDialog,
    openEditDialog,
    handleDelete,
    handleSubmit,
    saveMutation,
    setDefaultMutation,
  };
}

export type AddressesController = ReturnType<typeof useAddresses>;
