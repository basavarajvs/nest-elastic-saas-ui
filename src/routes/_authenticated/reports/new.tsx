import { createFileRoute } from '@tanstack/react-router'
import { CreateReportPage } from '@/pages/reports/report-create'

export const Route = createFileRoute('/_authenticated/reports/new')({
  component: CreateReportPage,
})
