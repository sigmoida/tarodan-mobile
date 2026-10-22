import React from "react";
import { StyleSheet } from "react-native";
import { Icon, Pill, theme } from "@/ui";
import { SHIPMENT_STATUS_CHIP, SHIPMENT_CHIP_FALLBACK } from "../_lib/status";
import type { TFn } from "../_lib/types";

export function ShipmentStatusChip({
  status,
  t,
  testID,
}: {
  status?: string | null;
  t: TFn;
  testID?: string;
}) {
  const meta =
    (status && SHIPMENT_STATUS_CHIP[status]) || SHIPMENT_CHIP_FALLBACK;
  return (
    <Pill
      testID={testID}
      size="md"
      background={meta.bg}
      color={meta.fg}
      icon={
        meta.done ? (
          <Icon name="check" size={theme.iconSize.sm} color={meta.fg} />
        ) : undefined
      }
      style={styles.chip}
    >
      {t(meta.labelKey)}
    </Pill>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: "flex-start" },
});
