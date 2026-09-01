/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
export function SkipToMain() {
  return (
    <a
      className={`fixed inset-s-44 z-999 -translate-y-52 bg-accent-strong px-4 py-2 text-sm font-medium whitespace-nowrap text-white opacity-95 shadow-sm transition hover:bg-accent-emphasis focus:translate-y-3 focus:transform focus-visible:ring-1 focus-visible:ring-focus`}
      href='#main-content'
    >
      본문으로 건너뛰기
    </a>
  )
}
