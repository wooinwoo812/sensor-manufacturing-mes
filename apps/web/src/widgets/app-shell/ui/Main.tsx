/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { cn } from '@/shared/lib'

type MainProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  fluid?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Main({ fixed, className, fluid, ...props }: MainProps) {
  return (
    <main
      data-layout={fixed ? 'fixed' : 'auto'}
      className={cn(
        // 페이지 최상위 블록(제목·필터·표·패널)은 항상 16px 간격으로 쌓인다.
        // 페이지마다 mt-*를 붙이지 않게 해 리듬을 한 곳에서 고정한다.
        // 제목 ↔ 본문 ↔ 표 사이 20px. 16px 은 제목이 필터에 붙어 보였다.
        'flex flex-col gap-5 px-4 py-6 md:px-8',

        // If layout is fixed, make the main container flex and grow
        fixed && 'flex grow flex-col overflow-hidden',

        // If layout is not fluid, set the max-width
        !fluid &&
          '@7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl',
        className
      )}
      {...props}
    />
  )
}
