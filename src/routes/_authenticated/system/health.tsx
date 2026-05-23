import { createFileRoute } from '@tanstack/react-router'
import { SystemHealthPage } from '@/pages/system/health'

export const Route = createFileRoute('/_authenticated/system/health')({
  component: SystemHealthPage,
})
