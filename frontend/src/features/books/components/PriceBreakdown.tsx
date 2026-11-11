import type { PriceCalculation } from '../../../api/types'
import { formatAmount, formatDateTime, formatMoney, formatRate } from '../../../lib/format'
import { marginAmount } from '../pricing'

const LABEL = 'py-1.5 text-muted'
const VALUE = 'py-1.5 text-right tabular-nums'

export function PriceBreakdown({ calculation }: { calculation: PriceCalculation }) {
  const { currency } = calculation
  const money = (amount: number) => formatMoney(amount, currency)

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full border-collapse">
        <caption className="sr-only">Desglose del precio de venta</caption>
        <tbody>
          <tr>
            <th scope="row" className={`${LABEL} text-left font-normal`}>
              Costo
            </th>
            <td className={VALUE}>{formatMoney(calculation.cost_usd, 'USD')}</td>
          </tr>
          <tr>
            <th scope="row" className={`${LABEL} text-left font-normal`}>
              Tasa USD → {currency}
            </th>
            <td className={VALUE}>× {formatRate(calculation.exchange_rate)}</td>
          </tr>
          <tr>
            <th scope="row" className={`${LABEL} text-left font-normal`}>
              Costo en {currency}
            </th>
            <td className={VALUE}>{money(calculation.cost_local)}</td>
          </tr>
          <tr>
            <th scope="row" className={`${LABEL} text-left font-normal`}>
              Margen {calculation.margin_percentage} %
            </th>
            <td className={VALUE}>+ {money(marginAmount(calculation))}</td>
          </tr>
          <tr className="border-t border-ink">
            <th scope="row" className="pt-3 text-left font-bold">
              Precio sugerido
            </th>
            <td className="pt-3 text-right tabular-nums">
              <span className="text-[26px] font-bold tracking-tight text-accent-text">
                {formatAmount(calculation.selling_price_local, currency)}
              </span>{' '}
              <span className="font-medium text-muted">{currency}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {calculation.rate_source === 'default' ? (
        <p role="note" className="text-[13px] text-warning">
          La API de tasas no respondió: se usó la tasa por defecto. Recalcula más tarde para usar la
          tasa del día.
        </p>
      ) : (
        <p className="text-[13px] text-muted">
          Tasa del día · calculado el {formatDateTime(calculation.calculation_timestamp)}
        </p>
      )}
    </div>
  )
}
