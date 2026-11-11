const LOCALE = 'es-ES'

const amountFormatters = new Map<string, Intl.NumberFormat>()

/**
 * Formats an amount with the decimals its currency uses (2 for EUR, 0 for JPY or CLP),
 * without the currency code, so tables can show the code in its own style.
 */
export function formatAmount(amount: number, currency: string): string {
  let formatter = amountFormatters.get(currency)
  if (!formatter) {
    const { maximumFractionDigits } = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
    }).resolvedOptions()
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: maximumFractionDigits,
      maximumFractionDigits,
    })
    amountFormatters.set(currency, formatter)
  }
  return formatter.format(amount)
}

/** An amount followed by its currency code, e.g. "20,02 EUR". */
export function formatMoney(amount: number, currency: string): string {
  return `${formatAmount(amount, currency)} ${currency}`
}

const integerFormatter = new Intl.NumberFormat(LOCALE)

export function formatInteger(value: number): string {
  return integerFormatter.format(value)
}

const rateFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 6 })

/** Exchange rates keep their precision (up to 6 decimals) but drop trailing zeros. */
export function formatRate(rate: number): string {
  return rateFormatter.format(rate)
}

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate)
  return Number.isNaN(date.getTime()) ? '' : dateTimeFormatter.format(date)
}
