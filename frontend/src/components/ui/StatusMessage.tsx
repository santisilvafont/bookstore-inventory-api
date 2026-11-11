import type { ReactNode } from 'react'

interface StatusMessageProps {
  title: string
  children?: ReactNode
  action?: ReactNode
  tone?: 'neutral' | 'error'
}

/** Takes the place of content that cannot be shown: no results, or a failed request. */
export function StatusMessage({ title, children, action, tone = 'neutral' }: StatusMessageProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="flex flex-col items-start gap-2 border-y border-line py-12"
    >
      <p className={`text-base font-semibold ${tone === 'error' ? 'text-danger' : ''}`}>{title}</p>
      {children && <p className="max-w-prose text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
