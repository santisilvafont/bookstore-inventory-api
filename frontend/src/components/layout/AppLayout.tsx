import type { ReactNode } from 'react'

interface AppLayoutProps {
  actions?: ReactNode
  children: ReactNode
}

export function AppLayout({ actions, children }: AppLayoutProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex min-h-15 max-w-310 flex-wrap items-center justify-between gap-4 px-4 sm:px-8">
          <p className="flex items-baseline gap-2.5">
            <span className="text-[17px] font-bold tracking-tight">Librería</span>
            <span className="text-muted" aria-hidden="true">
              /
            </span>
            <span className="text-muted">Inventario</span>
          </p>
          {actions}
        </div>
      </header>
      <main className="mx-auto max-w-310 px-4 pt-7 pb-12 sm:px-8">{children}</main>
    </div>
  )
}
