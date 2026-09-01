/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
export function SkipToMain() {
  return (
    <a
      className="fixed start-4 top-0 z-skip -translate-y-full rounded-control bg-accent-strong px-4 py-2 text-sm font-medium whitespace-nowrap text-white shadow-panel transition-transform hover:bg-accent-emphasis focus:translate-y-4 focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
      href="#main-content"
    >
      본문으로 건너뛰기
    </a>
  )
}
