/** Toasts live outside dialogs; interacting with one must not count as clicking outside. */
export function ignoreToastInteractions(event: {
  target: EventTarget | null
  preventDefault: () => void
}) {
  if (event.target instanceof Element && event.target.closest('[data-sonner-toaster]')) {
    event.preventDefault()
  }
}
