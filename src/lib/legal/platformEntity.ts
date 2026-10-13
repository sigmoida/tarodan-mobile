import { LEGAL_ENTITY } from "@/constants/legalFacts";
import type { Translate } from "./types";

/**
 * Platformu işleten tüzel kişinin künyesi — web
 * `apps/web/src/lib/legal/platform-entity.ts` karşılığı. Değerler mobilde
 * zaten `LEGAL_ENTITY`te (web ile aynı); ikinci kopya tutulmaz. Değerler
 * çevrilmez, yalnız alan etiketleri katalogdan gelir.
 */
export const PLATFORM_ENTITY = LEGAL_ENTITY;

/** Künyenin hukuki metinlerde tekrarlanan "etiket: değer" dökümü. */
export const PLATFORM_ENTITY_FIELDS = (
  t: Translate,
): { label: string; value: string }[] => [
  { label: t("legal.entity.legalName"), value: PLATFORM_ENTITY.legalName },
  { label: t("legal.entity.brand"), value: PLATFORM_ENTITY.brand },
  {
    label: t("legal.entity.taxRegistration"),
    value: PLATFORM_ENTITY.taxRegistration,
  },
  { label: t("legal.entity.address"), value: PLATFORM_ENTITY.address },
  { label: t("legal.entity.phone"), value: PLATFORM_ENTITY.phone },
  { label: t("legal.entity.email"), value: PLATFORM_ENTITY.email },
  { label: t("legal.entity.kep"), value: PLATFORM_ENTITY.kep },
];
