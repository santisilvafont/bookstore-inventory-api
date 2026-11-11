export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'danger' | 'link'
export type ButtonSize = 'md' | 'sm'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent font-semibold text-on-accent hover:bg-accent-hover',
  secondary: 'border border-line bg-surface font-medium text-ink hover:border-muted',
  subtle: 'border border-accent-line font-semibold text-accent-text hover:border-accent',
  danger: 'bg-danger font-semibold text-on-accent hover:bg-danger-hover',
  link: 'font-semibold text-accent-text underline-offset-4 hover:underline',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-10 px-4',
  sm: 'min-h-8 px-2.5 text-[13px]',
}

/** Button styles, also used for links that should look like buttons (e.g. "Editar"). */
export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md') {
  const sizeClasses = variant === 'link' ? 'min-h-10 px-1' : SIZES[size]
  return `inline-flex cursor-pointer items-center justify-center gap-2 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses} ${VARIANTS[variant]}`
}
