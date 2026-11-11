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

const integerFormatter = new Intl.NumberFormat(LOCALE)

export function formatInteger(value: number): string {
  return integerFormatter.format(value)
}
