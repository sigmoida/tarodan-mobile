import React from "react";
import { View } from "react-native";
import { Badge, Button, IconButton, Text } from "@/ui";
import { useTranslation } from "react-i18next";
import { styles } from "../_lib/styles";
import type { Address } from "../_lib/types";

/**
 * Tek kayıtlı adres satırı — web profil `AddressesSection` satırı: çerçeveli kutu, başlık +
 * "Varsayılan" rozeti, ad, telefon, adres; sağda düzenle / sil. Satır başı süs ikonu yok.
 */
export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  setDefaultPending,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  setDefaultPending: boolean;
}) {
  const { t } = useTranslation();
  const postal = address.zipCode ?? address.postalCode;
  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <View style={styles.titleRow}>
          {address.title ? (
            <Text variant="label" numberOfLines={1} style={styles.addressTitle}>
              {address.title}
            </Text>
          ) : null}
          {address.isDefault && <Badge size="sm">{t("mobile.default")}</Badge>}
        </View>
        <Text variant="bodySm" weight="medium" tone="heading">
          {address.fullName}
        </Text>
        <Text variant="bodySm" tone="muted">
          {t("sale.phoneLabel", { phone: address.phone })}
        </Text>
        <Text variant="bodySm" tone="muted" style={styles.addressDetail}>
          {address.address}, {address.district}, {address.city}
          {postal ? ` ${postal}` : ""}
        </Text>
        {!address.isDefault && (
          <Button
            variant="link"
            size="sm"
            title={t("address.makeDefault")}
            onPress={onSetDefault}
            isLoading={setDefaultPending}
            style={styles.defaultButton}
          />
        )}
      </View>
      <View style={styles.rowActions}>
        <IconButton
          icon="pencil"
          size="sm"
          accessibilityLabel={t("address.editAddress")}
          onPress={onEdit}
        />
        <IconButton
          icon="trash"
          variant="danger"
          size="sm"
          accessibilityLabel={t("address.deleteAddress")}
          onPress={onDelete}
        />
      </View>
    </View>
  );
}
