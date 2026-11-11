import { describe, expect, it } from 'vitest'

import { ApiError } from './client'
import { describeError, isRetryable } from './errors'

describe('describeError', () => {
  it.each([
    [0, 'Sin conexión con la API'],
    [400, 'Datos no válidos'],
    [404, 'No encontrado'],
    [500, 'Error del servidor'],
    [503, 'Servicio no disponible'],
  ])('gives a specific title to status %i', (status, title) => {
    expect(describeError(new ApiError(status, 'x', 'Mensaje de la API')).title).toBe(title)
  })

  it('shows the API message when it is meant for the user', () => {
    const error = new ApiError(404, 'not_found', 'No existe un libro con este ID.')

    expect(describeError(error).description).toBe('No existe un libro con este ID.')
  })

  it('hides internal details of server errors', () => {
    const error = new ApiError(500, 'server_error', 'Traceback…')

    expect(describeError(error).description).not.toContain('Traceback')
  })

  it('handles errors that are not ApiErrors', () => {
    expect(describeError(new Error('boom')).title).toBe('Error inesperado')
  })
})

describe('isRetryable', () => {
  it.each([
    [0, true],
    [500, true],
    [503, true],
    [400, false],
    [404, false],
  ])('status %i → %s', (status, expected) => {
    expect(isRetryable(new ApiError(status, 'x', 'x'))).toBe(expected)
  })

  it('does not retry unknown errors', () => {
    expect(isRetryable(new Error('boom'))).toBe(false)
  })
})
