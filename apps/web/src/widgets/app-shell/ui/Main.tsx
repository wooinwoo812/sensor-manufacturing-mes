/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { cn } from "@/shared/lib";

type MainProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean;
  fluid?: boolean;
  ref?: React.Ref<HTMLElement>;
};

export function Main({ fixed, className, fluid, ...props }: MainProps) {
  return (
    <main
      data-layout={fixed ? "fixed" : "auto"}
      className={cn(
        // 페이지 블록 간 20px. 글자 크기는 유지하고 불필요한 외곽 여백을 줄인다.
        "flex min-w-0 flex-col gap-5 px-4 py-6 md:px-7",

        // If layout is fixed, make the main container flex and grow
        fixed && "flex grow flex-col overflow-hidden",

        // 사이드바를 제외한 영역의 중앙에 배치해 넓은 화면에서도 좌우 여백을 맞춘다.
        "mx-auto w-full",
        !fluid && "max-w-[1400px]",
        className,
      )}
      {...props}
    />
  );
}
