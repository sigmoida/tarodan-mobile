import { Linking, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme, Text, Button } from "@/ui";
import { useForceUpdate } from "@/hooks/useForceUpdate";
import {
  FullScreenGate,
  FullScreenGateIcon,
} from "@/components/common/FullScreenGate";

const { spacing } = theme;
// spacing tokens are numeric (spacing[2]=8, [6]=24) — see design-tokens.

/**
 * Blocking force-update gate (#233). When the API (#232) reports this build is
 * below the minimum supported version, it covers the whole app with a
 * full-screen overlay linking to the store — the user cannot reach any other
 * screen (so no further backend calls happen) until they update.
 *
 * Surface + z-order come from the shared `FullScreenGate` (layer
 * `forceUpdate`, above the required-steps gate). Mounted at the root inside
 * the providers (needs QueryClient). Fail-open: renders null while loading,
 * on any error, or on web/unknown platform.
 */
export default function ForceUpdateGate({
  ready = true,
}: {
  /**
   * False while the animated splash is still up: the gate is a native Modal
   * and would cover it. The version check keeps running meanwhile.
   */
  ready?: boolean;
}) {
  const { t } = useTranslation();
  const { updateRequired, storeUrl } = useForceUpdate();
  if (!updateRequired || !ready) return null;

  return (
    <FullScreenGate layer="forceUpdate" testID="force-update-gate">
      <View style={styles.content}>
        <FullScreenGateIcon name="cloud-download-outline" size={96} />
        <Text variant="h2" align="center" style={styles.title}>
          {t("mobile.forceUpdateTitle")}
        </Text>
        <Text
          variant="body"
          tone="muted"
          align="center"
          style={styles.description}
        >
          {t("mobile.forceUpdateDescription")}
        </Text>
        <Button
          variant="primary"
          fullWidth
          title={t("mobile.forceUpdateButton")}
          onPress={() => storeUrl && Linking.openURL(storeUrl)}
          style={styles.button}
        />
      </View>
    </FullScreenGate>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
  },
  title: {
    marginBottom: spacing[2],
  },
  description: {
    marginBottom: spacing[6],
    maxWidth: 320,
  },
  button: {
    maxWidth: 320,
    width: "100%",
  },
});
