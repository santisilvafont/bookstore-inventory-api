import { useCallback } from 'react'

import { useDebouncedField } from '../../../lib/useDebouncedField'

const INPUT =
  'h-9.5 rounded border border-line bg-field px-3 text-ink placeholder:text-faint focus:border-accent'

const trim = (value: string) => value.trim()

export function CategorySearch({
  value,
  onChange,
}: {
  value: string
  onChange: (category: string) => void
}) {
  const [draft, setDraft] = useDebouncedField(value, onChange, { normalize: trim })

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="category-search" className="text-muted">
        Categoría
      </label>
      <input
        id="category-search"
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Fantasía, Historia…"
        className={`${INPUT} w-60`}
      />
    </div>
  )
}

export function ThresholdInput({
  value,
  onChange,
}: {
  value: number
  onChange: (threshold: number) => void
}) {
  const commit = useCallback(
    (draft: string) => {
      if (/^\d+$/.test(draft)) onChange(Number(draft))
    },
    [onChange],
  )
  const [draft, setDraft] = useDebouncedField(String(value), commit)

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="low-stock-threshold" className="text-muted">
        Stock igual o menor que
      </label>
      <input
        id="low-stock-threshold"
        type="number"
        inputMode="numeric"
        min={0}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className={`${INPUT} w-20 tabular-nums`}
      />
    </div>
  )
}
