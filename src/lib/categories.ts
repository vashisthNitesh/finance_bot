// Canonical transaction categories.
// The DB stores whatever label the AI produced (historically Indonesian names),
// so every lookup goes through normalizeCategory() to map aliases -> canonical key.

export type CategoryKey =
  | "food"
  | "transport"
  | "entertainment"
  | "shopping"
  | "health"
  | "business"
  | "bills"
  | "salary"
  | "gift"
  | "investment"
  | "other";

export interface CategoryDef {
  key: CategoryKey;
  label: { en: string; id: string };
  /** Fixed chart color per category (dataviz palette, entity-stable). */
  color: string;
  aliases: string[];
}

export const CATEGORIES: CategoryDef[] = [
  { key: "food",          label: { en: "Food & Drink",  id: "Makan & Minum" },  color: "#eb6834", aliases: ["makan & minum", "food & drink", "food"] },
  { key: "transport",     label: { en: "Transport",     id: "Transportasi" },   color: "#2a78d6", aliases: ["transportasi", "transport"] },
  { key: "entertainment", label: { en: "Entertainment", id: "Hiburan" },        color: "#4a3aa7", aliases: ["hiburan", "entertainment"] },
  { key: "shopping",      label: { en: "Shopping",      id: "Belanja" },        color: "#e87ba4", aliases: ["belanja", "shopping"] },
  { key: "health",        label: { en: "Health",        id: "Kesehatan" },      color: "#e34948", aliases: ["kesehatan", "health"] },
  { key: "business",      label: { en: "Business",      id: "Bisnis" },         color: "#eda100", aliases: ["bisnis", "business"] },
  { key: "bills",         label: { en: "Bills",         id: "Tagihan" },        color: "#1baf7a", aliases: ["tagihan", "bills"] },
  { key: "salary",        label: { en: "Salary",        id: "Gaji" },           color: "#008300", aliases: ["gaji", "salary"] },
  { key: "gift",          label: { en: "Gift",          id: "Pemberian" },      color: "#d55181", aliases: ["pemberian", "gift", "hadiah"] },
  { key: "investment",    label: { en: "Investment",    id: "Investasi" },      color: "#184f95", aliases: ["investasi", "investment"] },
  { key: "other",         label: { en: "Other",         id: "Lainnya" },        color: "#898781", aliases: ["lainnya", "other"] },
];

const aliasMap = new Map<string, CategoryDef>();
for (const cat of CATEGORIES) {
  aliasMap.set(cat.key, cat);
  for (const alias of cat.aliases) aliasMap.set(alias, cat);
}

export function normalizeCategory(raw: string | null | undefined): CategoryDef {
  if (!raw) return aliasMap.get("other")!;
  return aliasMap.get(raw.trim().toLowerCase()) ?? aliasMap.get("other")!;
}

export function categoryLabel(raw: string | null | undefined, lang: "en" | "id"): string {
  return normalizeCategory(raw).label[lang];
}
