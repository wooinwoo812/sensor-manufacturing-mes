import { createContext, useContext } from "react";

export interface PageCrumbValue {
  crumb: string | undefined;
  setCrumb: (crumb: string | undefined) => void;
}

export const PageCrumbContext = createContext<PageCrumbValue>({
  crumb: undefined,
  setCrumb: () => {},
});

export function usePageCrumbValue(): string | undefined {
  return useContext(PageCrumbContext).crumb;
}
