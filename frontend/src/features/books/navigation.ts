import { useLocation, useNavigate } from 'react-router'

/**
 * Marks navigations to an overlay (detail panel, form) that start inside the app. Closing such
 * an overlay goes back in history, so open/close does not pile up entries; one opened from a
 * pasted link has nothing of ours behind it and closes by replacing its own entry.
 */
export const inAppNavigationState = { fromApp: true } as const

function cameFromApp(state: unknown): boolean {
  return (state as { fromApp?: unknown } | null)?.fromApp === true
}

/** Book ids in URLs must be canonical: "1e1" or "0x10" would otherwise open real books. */
export function parseBookId(value: string | undefined): number | null {
  return value && /^[1-9]\d*$/.test(value) ? Number(value) : null
}

/** Closes the current overlay, keeping the catalog filters (the query string). */
export function useCloseOverlay(fallbackPathname = '/') {
  const navigate = useNavigate()
  const { state, search } = useLocation()
  return () =>
    cameFromApp(state)
      ? navigate(-1)
      : navigate({ pathname: fallbackPathname, search }, { replace: true })
}
