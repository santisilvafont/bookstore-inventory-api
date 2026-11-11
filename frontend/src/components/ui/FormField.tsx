import { type ReactElement, cloneElement, useId } from 'react'

export const INPUT_CLASSES =
  'h-11 w-full rounded border border-line bg-field px-3 text-ink placeholder:text-faint focus:border-accent aria-invalid:border-danger aria-invalid:border-[1.5px] disabled:opacity-60'

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  className?: string
  /** The input; it receives the id and the ARIA attributes that link it to the label and messages. */
  children: ReactElement<Record<string, unknown>>
}

export function FormField({ label, error, hint, className = '', children }: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {error && (
        <p id={errorId} className="text-[13px] text-danger">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
