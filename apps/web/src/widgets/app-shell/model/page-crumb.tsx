import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PageCrumbContext } from "./page-crumb-context";

/** 상세 화면이 셸 헤더 경로의 세 번째 단계(식별자)를 채울 수 있게 하는 컨텍스트 제공자. */
export function PageCrumbProvider({ children }: { children: ReactNode }) {
  const [crumb, setCrumb] = useState<string | undefined>(undefined);
  const value = useMemo(() => ({ crumb, setCrumb }), [crumb]);
  return <PageCrumbContext.Provider value={value}>{children}</PageCrumbContext.Provider>;
}

/**
 * 상세 화면 안에서 `<PageCrumb value={detail.orderNumber} />` 로 두면 헤더 경로가
 * "생산 / 작업지시 / WO-2026-095" 가 되고, 화면을 떠나면 자동으로 지워진다.
 */
export function PageCrumb({ value }: { value: string | undefined }) {
  const { setCrumb } = useContext(PageCrumbContext);
  useEffect(() => {
    setCrumb(value);
    return () => setCrumb(undefined);
  }, [setCrumb, value]);
  return null;
}
