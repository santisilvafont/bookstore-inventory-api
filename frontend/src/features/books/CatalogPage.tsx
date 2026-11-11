import { useCallback, useEffect, useMemo } from 'react'
import { Outlet, useSearchParams } from 'react-router'

import { ApiError } from '../../api/client'
import { describeError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { StatusMessage } from '../../components/ui/StatusMessage'
import {
  CATALOG_HEADING_ID,
  type CatalogParams,
  PAGE_SIZE,
  type StockView,
  parseCatalogParams,
  toBookFilter,
  toSearchParams,
} from './catalogParams'
import { BookTable, BookTableSkeleton } from './components/BookTable'
import { CategorySearch, ThresholdInput } from './components/CatalogToolbarFields'
import { StockTabs } from './components/StockTabs'
import { useBookList, useCountries, useStockCounts } from './queries'

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = parseCatalogParams(searchParams)
  const filter = toBookFilter(params)

  const books = useBookList(filter, params.page)
  const counts = useStockCounts(params.threshold)
  const countries = useCountries()

  const countryNames = useMemo(
    () => new Map(countries.data?.map((country) => [country.code, country.name])),
    [countries.data],
  )

  const update = useCallback(
    (changes: Partial<CatalogParams>, { replace = false } = {}) => {
      setSearchParams(
        (current) => {
          // Changing a filter changes which books fall on each page, so it restarts at page 1.
          const next = { ...parseCatalogParams(current), page: 1, ...changes }
          return toSearchParams(next)
        },
        { replace },
      )
    },
    [setSearchParams],
  )
  // Typed filters replace the history entry, so Back does not step through partial searches.
  const changeCategory = useCallback(
    (category: string) => update({ category }, { replace: true }),
    [update],
  )
  const changeThreshold = useCallback(
    (threshold: number) => update({ threshold }, { replace: true }),
    [update],
  )

  const hrefFor = (stock: StockView) =>
    `?${toSearchParams({ ...params, stock, category: '', page: 1 })}`

  // A page beyond the last one gets a 404 from the API. If this page was just emptied (its last
  // book deleted) go to the previous one; for an old or mistyped link, start over at page 1.
  const isPageOutOfRange =
    params.page > 1 && books.error instanceof ApiError && books.error.status === 404
  const fallbackPage = books.data?.page === params.page ? params.page - 1 : 1
  useEffect(() => {
    // Replace, not push: otherwise Back would return to the invalid page and loop.
    if (isPageOutOfRange) update({ page: fallbackPage }, { replace: true })
  }, [isPageOutOfRange, fallbackPage, update])

  return (
    <div className="flex flex-col gap-5">
      <h1 id={CATALOG_HEADING_ID} tabIndex={-1} className="sr-only">
        Catálogo
      </h1>

      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-line">
        <StockTabs current={params.stock} counts={counts} hrefFor={hrefFor} />
        <div className="pb-2">
          {params.stock === 'low' ? (
            <ThresholdInput value={params.threshold} onChange={changeThreshold} />
          ) : params.stock === 'all' ? (
            <CategorySearch value={params.category} onChange={changeCategory} />
          ) : null}
        </div>
      </div>

      {books.isPending ? (
        <BookTableSkeleton rows={PAGE_SIZE} />
      ) : books.isError && !isPageOutOfRange ? (
        <StatusMessage
          tone="error"
          title={describeError(books.error).title}
          action={<Button onClick={() => books.refetch()}>Reintentar</Button>}
        >
          {describeError(books.error).description}
        </StatusMessage>
      ) : books.data && books.data.count === 0 ? (
        <EmptyCatalog params={params} onShowAll={() => update({ stock: 'all', category: '' })} />
      ) : books.data ? (
        <>
          <BookTable
            books={books.data.results}
            countryNames={countryNames}
            lowStockThreshold={params.threshold}
            isUpdating={books.isPlaceholderData}
          />
          <Pagination
            page={books.data.page}
            pageSize={books.data.page_size}
            totalItems={books.data.count}
            totalPages={books.data.total_pages}
            onPageChange={(page) => update({ page })}
          />
        </>
      ) : null}

      {/* The book detail panel (/books/:id) opens over the catalog. */}
      <Outlet />
    </div>
  )
}

function EmptyCatalog({ params, onShowAll }: { params: CatalogParams; onShowAll: () => void }) {
  const showAll = <Button onClick={onShowAll}>Ver todo el catálogo</Button>

  if (params.stock === 'out') {
    return <StatusMessage title="No hay libros agotados." action={showAll} />
  }
  if (params.stock === 'low') {
    return (
      <StatusMessage
        title={`Ningún libro tiene ${params.threshold} unidades o menos.`}
        action={showAll}
      />
    )
  }
  if (params.category) {
    return (
      <StatusMessage title={`No hay libros en la categoría «${params.category}».`} action={showAll}>
        La búsqueda encuentra coincidencias parciales: prueba con una parte del nombre.
      </StatusMessage>
    )
  }
  return <StatusMessage title="Todavía no hay libros en el catálogo." />
}
