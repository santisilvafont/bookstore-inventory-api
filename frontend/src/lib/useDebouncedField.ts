import { useEffect, useState } from 'react'

interface Options {
  delay?: number
  /** How a draft becomes a committed value, e.g. trimming spaces. */
  normalize?: (draft: string) => string
}

const identity = (value: string) => value

/**
 * Local state for a text field whose value is committed only after the user stops typing.
 *
 * `value` is the committed value (e.g. from the URL). When it changes from outside, the draft
 * follows it; while the user types, `onCommit` runs once the draft has been stable for `delay` ms.
 */
export function useDebouncedField(
  value: string,
  onCommit: (value: string) => void,
  { delay = 300, normalize = identity }: Options = {},
): [string, (draft: string) => void] {
  const [draft, setDraft] = useState(value)
  const [previousValue, setPreviousValue] = useState(value)
  const [settledDraft, setSettledDraft] = useState(value)

  // Adjusting state while rendering is React's recommended way to follow a prop change.
  // The draft is kept when it already means the new value ("Ciencia " for "Ciencia").
  if (value !== previousValue) {
    setPreviousValue(value)
    if (normalize(draft) !== value) {
      setDraft(value)
      setSettledDraft(value)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => setSettledDraft(draft), delay)
    return () => clearTimeout(timeout)
  }, [draft, delay])

  useEffect(() => {
    // Only a draft the user has stopped editing is committed, never a stale one.
    if (settledDraft === draft && normalize(settledDraft) !== value) {
      onCommit(normalize(settledDraft))
    }
  }, [settledDraft, draft, value, onCommit, normalize])

  return [draft, setDraft]
}
