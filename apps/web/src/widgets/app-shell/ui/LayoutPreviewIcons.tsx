/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import type { SVGProps } from "react";

function PreviewFrame({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 52" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="1" y="1" width="78" height="50" rx="5" fill="currentColor" opacity="0.08" />
      {children}
    </svg>
  );
}

function Content({ x = 29, width = 44 }: { x?: number; width?: number }) {
  return (
    <>
      <rect x={x} y="8" width={width} height="4" rx="2" fill="currentColor" opacity="0.78" />
      <rect x={x} y="17" width={width * 0.58} height="3" rx="1.5" fill="currentColor" opacity="0.4" />
      <rect x={x} y="25" width={width} height="18" rx="3" fill="currentColor" opacity="0.18" />
    </>
  );
}

function SidebarBlock({ floating = false }: { floating?: boolean }) {
  return (
    <g>
      <rect
        x={floating ? 6 : 1}
        y={floating ? 6 : 1}
        width="21"
        height={floating ? 40 : 50}
        rx={floating ? 4 : 0}
        fill="currentColor"
        opacity="0.86"
      />
      <circle cx={floating ? 12 : 8} cy="12" r="3" fill="white" opacity="0.9" />
      <path d={floating ? "M10 21h12M10 27h9M10 33h11" : "M6 21h12M6 27h9M6 33h11"} stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.68" />
    </g>
  );
}

export function IconSidebarInset(props: SVGProps<SVGSVGElement>) {
  return (
    <PreviewFrame {...props}>
      <SidebarBlock />
      <rect x="27" y="6" width="47" height="40" rx="4" fill="currentColor" opacity="0.18" />
    </PreviewFrame>
  );
}

export function IconSidebarFloating(props: SVGProps<SVGSVGElement>) {
  return (
    <PreviewFrame {...props}>
      <SidebarBlock floating />
      <Content x={32} width={41} />
    </PreviewFrame>
  );
}

export function IconSidebarStandard(props: SVGProps<SVGSVGElement>) {
  return (
    <PreviewFrame {...props}>
      <SidebarBlock />
      <Content x={28} width={45} />
    </PreviewFrame>
  );
}

export function IconLayoutExpanded(props: SVGProps<SVGSVGElement>) {
  return (
    <PreviewFrame {...props}>
      <SidebarBlock floating />
      <Content x={32} width={41} />
    </PreviewFrame>
  );
}

export function IconLayoutCompact(props: SVGProps<SVGSVGElement>) {
  return (
    <PreviewFrame {...props}>
      <rect x="5" y="6" width="8" height="40" rx="3" fill="currentColor" opacity="0.86" />
      <circle cx="9" cy="12" r="2" fill="white" opacity="0.9" />
      <Content x={19} width={54} />
    </PreviewFrame>
  );
}

export function IconLayoutFull(props: SVGProps<SVGSVGElement>) {
  return (
    <PreviewFrame {...props}>
      <Content x={7} width={66} />
    </PreviewFrame>
  );
}
