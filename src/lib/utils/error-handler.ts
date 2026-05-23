import { AxiosError } from 'axios'

export function getErrorMessage(error: unknown): string {
  if (!error) return 'Something went wrong!'

  if (typeof error === 'string') return error

  if (error instanceof AxiosError) {
    const title = error.response?.data?.title
    if (typeof title === 'string' && title.length > 0) return title
    return error.message
  }

  if (error instanceof Error) return error.message

  if (
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  ) {
    return (error as Record<string, string>).message
  }

  return 'Something went wrong!'
}
