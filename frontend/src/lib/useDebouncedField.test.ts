import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDebouncedField } from './useDebouncedField'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function setup(initialValue = '', normalize?: (value: string) => string) {
  const onCommit = vi.fn<(value: string) => void>()
  const hook = renderHook(
    ({ value }) => useDebouncedField(value, onCommit, { delay: 300, normalize }),
    { initialProps: { value: initialValue } },
  )
  const type = (text: string) => act(() => hook.result.current[1](text))
  const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))
  return { hook, onCommit, type, wait, draft: () => hook.result.current[0] }
}

describe('useDebouncedField', () => {
  it('commits once the user stops typing', () => {
    const { onCommit, type, wait } = setup()

    type('Fan')
    wait(200)
    type('Fanta')
    wait(299)
    expect(onCommit).not.toHaveBeenCalled()

    wait(1)
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('Fanta')
  })

  it('follows a value changed from outside', () => {
    const { hook, type, draft } = setup('Fantasía')

    type('Fan')
    hook.rerender({ value: '' })

    expect(draft()).toBe('')
  })

  it('does not commit a draft overwritten from outside', () => {
    const { hook, onCommit, type, wait } = setup()

    type('Fan')
    hook.rerender({ value: 'Historia' })
    wait(500)

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('keeps what the user typed when it normalizes to the committed value', () => {
    const trim = (value: string) => value.trim()
    const { hook, onCommit, type, wait, draft } = setup('', trim)

    type('Ciencia ')
    wait(300)
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('Ciencia')

    hook.rerender({ value: 'Ciencia' })
    expect(draft()).toBe('Ciencia ')
  })
})
