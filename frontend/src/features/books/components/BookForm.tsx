import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'

import { ApiError } from '../../../api/client'
import type { BookInput } from '../../../api/types'
import { Button } from '../../../components/ui/Button'
import { FormField, INPUT_CLASSES } from '../../../components/ui/FormField'
import { Spinner } from '../../../components/ui/Spinner'
import { findIsbnProblem, stripIsbn, toIsbn13 } from '../../../lib/isbn'
import { notifyError } from '../../../lib/notify'
import { type BookFormValues, bookFormSchema, emptyBookForm } from '../bookSchema'
import { useCountries } from '../queries'

interface BookFormProps {
  defaultValues: BookFormValues
  submitLabel: string
  /** Saves the book; a rejected promise with an ApiError puts the server's messages on the form. */
  onSubmit: (input: BookInput) => Promise<void>
  onCancel: () => void
}

const FORM_FIELDS = new Set(Object.keys(emptyBookForm))

export function BookForm({ defaultValues, submitLabel, onSubmit, onCancel }: BookFormProps) {
  const countries = useCountries()
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BookFormValues, unknown, BookInput>({
    resolver: zodResolver(bookFormSchema),
    defaultValues,
    // Validate a field when the user leaves it, then on every change until it is fixed.
    mode: 'onTouched',
  })
  const isbn = useWatch({ control, name: 'isbn' })

  const submit = handleSubmit(async (input) => {
    try {
      await onSubmit(input)
    } catch (error) {
      notifyError(error)
      if (error instanceof ApiError) showServerErrors(error)
    }
  })

  // The API has the last word (e.g. a duplicate ISBN): its messages go under each field.
  function showServerErrors(error: ApiError) {
    let isFirst = true
    for (const [field, messages] of Object.entries(error.fieldErrors)) {
      if (FORM_FIELDS.has(field)) {
        setError(
          field as keyof BookFormValues,
          { type: 'server', message: messages[0] },
          { shouldFocus: isFirst },
        )
        isFirst = false
      } else {
        setError('root.server', { type: 'server', message: messages.join(' ') })
      }
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col">
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 px-7 pt-4 pb-6 sm:grid-cols-2">
        <FormField label="Título" error={errors.title?.message} className="sm:col-span-2">
          <input {...register('title')} className={INPUT_CLASSES} autoComplete="off" />
        </FormField>

        <FormField label="Autor" error={errors.author?.message} className="sm:col-span-2">
          <input {...register('author')} className={INPUT_CLASSES} autoComplete="off" />
        </FormField>

        <FormField
          label="ISBN"
          error={errors.isbn?.message}
          hint={isbnHint(isbn)}
          className="sm:col-span-2"
        >
          <input
            {...register('isbn')}
            className={`${INPUT_CLASSES} tabular-nums`}
            inputMode="numeric"
            autoComplete="off"
          />
        </FormField>

        <FormField label="Costo (USD)" error={errors.cost_usd?.message}>
          <input
            {...register('cost_usd')}
            className={`${INPUT_CLASSES} tabular-nums`}
            inputMode="decimal"
            placeholder="15,99"
            autoComplete="off"
          />
        </FormField>

        <FormField label="Stock" error={errors.stock_quantity?.message}>
          <input
            {...register('stock_quantity')}
            className={`${INPUT_CLASSES} tabular-nums`}
            inputMode="numeric"
            autoComplete="off"
          />
        </FormField>

        <FormField label="Categoría" error={errors.category?.message}>
          <input {...register('category')} className={INPUT_CLASSES} autoComplete="off" />
        </FormField>

        <FormField
          label="País del proveedor"
          error={errors.supplier_country?.message}
          hint={
            countries.isError
              ? 'No se pudieron cargar los países. Cierra y vuelve a abrir.'
              : undefined
          }
        >
          <select
            {...register('supplier_country')}
            className={INPUT_CLASSES}
            disabled={!countries.data}
          >
            <option value="">{countries.isPending ? 'Cargando países…' : 'Elige un país'}</option>
            {countries.data?.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </FormField>

        {errors.root?.server && (
          <p role="alert" className="text-danger sm:col-span-2">
            {errors.root.server.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2.5 border-t border-line px-7 py-4">
        <Button onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {isSubmitting ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function isbnHint(value: string): string {
  const isbn = stripIsbn(value)
  if (isbn.length === 10 && findIsbnProblem(isbn) === null) {
    return `Es un ISBN-10: se guardará como ISBN-13 (${toIsbn13(isbn)}).`
  }
  return 'ISBN-10 o ISBN-13, con o sin guiones.'
}
