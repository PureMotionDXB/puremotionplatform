export type PackageKind = "credits" | "membership";
export type DisplayTab = "starter" | "credit" | "membership";

export interface Package {
  id: string;
  name: string;
  family: string; // service_categories.id
  kind: PackageKind;
  creditAmount: number | null; // kind: "credits" — total credits granted, incl. any bonus
  durationDays: number | null; // kind: "membership", mutually exclusive with durationMonths
  durationMonths: number | null;
  priceAed: number; // pre-VAT
  stripeProductId: string;
  stripePriceId: string;
  displayTab: DisplayTab;
  displayOrder: number;
  detail: string | null;
  note: string | null;
  singleClass: boolean; // the "pay for this exact class" option for its family
  active: boolean;
}

export function emptyPackage(defaultFamily = ""): Omit<Package, "id" | "stripeProductId" | "stripePriceId"> {
  return {
    name: "",
    family: defaultFamily,
    kind: "credits",
    creditAmount: 1,
    durationDays: null,
    durationMonths: null,
    priceAed: 0,
    displayTab: "credit",
    displayOrder: 0,
    detail: null,
    note: null,
    singleClass: false,
    active: true,
  };
}
