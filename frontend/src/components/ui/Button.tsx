import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'link'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover px-4 font-semibold',
  secondary: 'border border-line bg-surface text-ink hover:border-muted px-4 font-medium',
  danger: 'bg-danger text-on-accent hover:bg-danger-hover px-4 font-semibold',
  link: 'px-1 font-semibold text-accent-text hover:underline underline-offset-4',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
