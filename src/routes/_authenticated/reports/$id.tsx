import { createFileRoute } from '@tanstack/react-router'
import { ReportDetailPage } from '@/pages/reports/report-detail'

export const Route = createFileRoute('/_authenticated/reports/$id')({
  component: ReportDetailPage,
})
