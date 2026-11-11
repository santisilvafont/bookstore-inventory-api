import { Link } from 'react-router'

import { formatInteger } from '../../../lib/format'
import type { StockView } from '../catalogParams'

interface Tab {
  view: StockView
  label: string
  count: number | undefined
  countClassName: string
  href: string
}

interface StockTabsProps {
  current: StockView
  counts: Record<StockView, number | undefined>
  hrefFor: (view: StockView) => string
}

/** The stock totals double as the filters: each one is a link to its view. */
export function StockTabs({ current, counts, hrefFor }: StockTabsProps) {
  const tabs: Tab[] = [
    {
      view: 'all',
      label: 'Todos',
      count: counts.all,
      countClassName: 'text-muted',
      href: hrefFor('all'),
    },
    {
      view: 'low',
      label: 'Stock bajo',
      count: counts.low,
      countClassName: 'text-warning',
      href: hrefFor('low'),
    },
    {
      view: 'out',
      label: 'Agotados',
      count: counts.out,
      countClassName: 'text-danger',
      href: hrefFor('out'),
    },
  ]

  return (
    <nav aria-label="Filtrar por stock" className="flex gap-7">
      {tabs.map((tab) => {
        const isCurrent = tab.view === current
        return (
          <Link
            key={tab.view}
            to={tab.href}
            aria-current={isCurrent ? 'page' : undefined}
            className={`-mb-px inline-flex items-baseline gap-2 border-b-2 pt-2.5 pb-3 transition-colors ${
              isCurrent
                ? 'border-accent font-semibold text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
            <span className={`font-semibold tabular-nums ${tab.countClassName}`}>
              {tab.count === undefined ? '' : formatInteger(tab.count)}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
