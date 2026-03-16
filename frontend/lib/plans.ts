export type PlanType = "free" | "pro" | "ultra";

export interface PlanDefinition {
  id: PlanType;
  title: string;
  subtitle: string;
  features: string[];
}

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "free",
    title: "billing.plans.free.title",
    subtitle: "billing.plans.free.subtitle",
    features: [
      "billing.plans.free.features.0",
      "billing.plans.free.features.1",
      "billing.plans.free.features.2",
      "billing.plans.free.features.3",
      "billing.plans.free.features.4",
    ],
  },
  {
    id: "pro",
    title: "billing.plans.pro.title",
    subtitle: "billing.plans.pro.subtitle",
    features: [
      "billing.plans.pro.features.0",
      "billing.plans.pro.features.1",
      "billing.plans.pro.features.2",
      "billing.plans.pro.features.3",
      "billing.plans.pro.features.4",
    ],
  },
  {
    id: "ultra",
    title: "billing.plans.ultra.title",
    subtitle: "billing.plans.ultra.subtitle",
    features: [
      "billing.plans.ultra.features.0",
      "billing.plans.ultra.features.1",
      "billing.plans.ultra.features.2",
      "billing.plans.ultra.features.3",
      "billing.plans.ultra.features.4",
    ],
  },
];
