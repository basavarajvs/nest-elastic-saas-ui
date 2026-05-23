import { createFileRoute } from '@tanstack/react-router'
import { RequestLogPage } from '@/pages/system/request-log'

export const Route = createFileRoute('/_authenticated/system/request-log')({
  component: RequestLogPage,
})
