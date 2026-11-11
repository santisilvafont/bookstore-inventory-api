import { ApiError } from '../../../api/client'
import { describeError } from '../../../api/errors'
import { Button } from '../../../components/ui/Button'
import { StatusMessage } from '../../../components/ui/StatusMessage'

/** Why a book could not be shown: it no longer exists, or the request failed and can be retried. */
export function BookLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (error instanceof ApiError && error.status === 404) {
    return <StatusMessage title="Este libro no existe o fue eliminado." />
  }
  const { title, description } = describeError(error)
  return (
    <StatusMessage
      tone="error"
      title={title}
      action={<Button onClick={onRetry}>Reintentar</Button>}
    >
      {description}
    </StatusMessage>
  )
}
