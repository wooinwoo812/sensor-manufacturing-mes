/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
/* eslint-disable react-refresh/only-export-components -- 셸 provider와 전용 hook은 하나의 내부 계약으로 함께 유지한다. */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCookie, setCookie } from "@/shared/lib";

export type SidebarCollapsible = "offcanvas" | "icon" | "none";
export type SidebarVariant = "inset" | "sidebar" | "floating";

const LAYOUT_COLLAPSIBLE_COOKIE_NAME = "layout_collapsible_base";
const LAYOUT_VARIANT_COOKIE_NAME = "layout_variant_base";
const LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const DEFAULT_COLLAPSIBLE: SidebarCollapsible = "icon";
const DEFAULT_VARIANT: SidebarVariant = "inset";

const collapsibleValues = new Set<SidebarCollapsible>([
  "offcanvas",
  "icon",
  "none",
]);
const variantValues = new Set<SidebarVariant>([
  "inset",
  "sidebar",
  "floating",
]);

interface LayoutContextValue {
  resetLayout: () => void;
  defaultCollapsible: SidebarCollapsible;
  collapsible: SidebarCollapsible;
  setCollapsible: (collapsible: SidebarCollapsible) => void;
  defaultVariant: SidebarVariant;
  variant: SidebarVariant;
  setVariant: (variant: SidebarVariant) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

function readCollapsibleCookie(): SidebarCollapsible {
  const saved = getCookie(LAYOUT_COLLAPSIBLE_COOKIE_NAME);
  return saved && collapsibleValues.has(saved as SidebarCollapsible)
    ? (saved as SidebarCollapsible)
    : DEFAULT_COLLAPSIBLE;
}

function readVariantCookie(): SidebarVariant {
  const saved = getCookie(LAYOUT_VARIANT_COOKIE_NAME);
  return saved && variantValues.has(saved as SidebarVariant)
    ? (saved as SidebarVariant)
    : DEFAULT_VARIANT;
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [collapsible, setCollapsibleState] =
    useState<SidebarCollapsible>(readCollapsibleCookie);
  const [variant, setVariantState] = useState<SidebarVariant>(readVariantCookie);

  const setCollapsible = (next: SidebarCollapsible) => {
    setCollapsibleState(next);
    setCookie(
      LAYOUT_COLLAPSIBLE_COOKIE_NAME,
      next,
      LAYOUT_COOKIE_MAX_AGE,
    );
  };

  const setVariant = (next: SidebarVariant) => {
    setVariantState(next);
    setCookie(LAYOUT_VARIANT_COOKIE_NAME, next, LAYOUT_COOKIE_MAX_AGE);
  };

  const value = useMemo<LayoutContextValue>(
    () => ({
      resetLayout: () => {
        setCollapsible(DEFAULT_COLLAPSIBLE);
        setVariant(DEFAULT_VARIANT);
      },
      defaultCollapsible: DEFAULT_COLLAPSIBLE,
      collapsible,
      setCollapsible,
      defaultVariant: DEFAULT_VARIANT,
      variant,
      setVariant,
    }),
    [collapsible, variant],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  const context = useContext(LayoutContext);

  if (!context) {
    throw new Error("useLayout은 LayoutProvider 안에서만 사용할 수 있습니다.");
  }

  return context;
}
