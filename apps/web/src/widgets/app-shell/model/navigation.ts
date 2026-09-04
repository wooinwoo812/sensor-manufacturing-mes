export type NavigationIcon =
  | "audit"
  | "bom"
  | "dashboard"
  | "execution"
  | "incident"
  | "inspection"
  | "material"
  | "trace"
  | "users"
  | "work-order";

export interface NavigationItem {
  label: string;
  icon: NavigationIcon;
  to?:
    | "/dashboard"
    | "/work-orders"
    | "/materials/lots"
    | "/execution/queue"
    | "/quality/inspections"
    | "/audit-events";
  pending?: boolean;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}
