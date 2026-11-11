/**
 * Marks navigations to a book's panel that start inside the catalog. Closing such a panel goes
 * back in history, so open/close does not pile up entries; a panel opened from a pasted link
 * has no catalog entry behind it and closes by replacing its own entry with the catalog.
 */
export const detailLinkState = { fromCatalog: true } as const

export function cameFromCatalog(state: unknown): boolean {
  return (state as { fromCatalog?: unknown } | null)?.fromCatalog === true
}
