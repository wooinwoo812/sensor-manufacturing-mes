/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. Licensed under the MIT License.
 * See THIRD_PARTY_NOTICES.md.
 */
import * as React from 'react'

const MOBILE_BREAKPOINT = 1024
const MOBILE_QUERY = `(width < ${MOBILE_BREAKPOINT / 16}rem)`

export function useIsMobile() {
  return React.useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(MOBILE_QUERY)
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  )
}
