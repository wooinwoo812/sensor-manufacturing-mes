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
  to?: "/dashboard";
  pending?: boolean;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}
