import { Toaster as SonnerToaster } from 'sonner'

/** Sonner's behaviour (stacking, timing, screen-reader announcements) with the app's styling. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="system"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-90 items-start gap-3 rounded border border-line bg-surface p-4 text-ink shadow-[0_8px_24px_rgb(20_18_15/0.14)]',
          title: 'font-semibold',
          description: 'mt-0.5 text-muted',
          icon: 'mt-0.5',
          success: '[&_[data-icon]]:text-accent-text',
          error: '[&_[data-icon]]:text-danger',
          actionButton:
            'ml-auto shrink-0 cursor-pointer self-center font-semibold text-accent-text hover:underline',
        },
      }}
    />
  )
}
