import { toast } from 'sonner'

import { describeError } from '../api/errors'

export function notifyError(error: unknown) {
  const { title, description } = describeError(error)
  toast.error(title, { description })
}
