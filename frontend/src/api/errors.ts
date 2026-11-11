import { ApiError } from './client'

export interface ErrorDescription {
  title: string
  description: string
}

/** Turns any thrown value into a message the user can act on. */
export function describeError(error: unknown): ErrorDescription {
  if (!(error instanceof ApiError)) {
    return {
      title: 'Error inesperado',
      description: 'Algo salió mal. Recarga la página e inténtalo de nuevo.',
    }
  }

  if (error.status === 0) {
    return {
      title: 'Sin conexión con la API',
      description: 'Comprueba que el backend está en marcha e inténtalo de nuevo.',
    }
  }
  if (error.status === 400) {
    return { title: 'Datos no válidos', description: error.message }
  }
  if (error.status === 404) {
    return { title: 'No encontrado', description: error.message }
  }
  if (error.status === 503) {
    return { title: 'Servicio no disponible', description: error.message }
  }
  if (error.status >= 500) {
    return {
      title: 'Error del servidor',
      description: 'El servidor no pudo completar la operación. Inténtalo de nuevo más tarde.',
    }
  }
  return { title: 'No se pudo completar la operación', description: error.message }
}

/** Network failures and server errors may succeed on a retry; client errors never will. */
export function isRetryable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500)
}
