import { createFileRoute } from '@tanstack/react-router'
import { SmtpConfigPage } from '@/pages/system/smtp-config'

export const Route = createFileRoute('/_authenticated/system/smtp')({
  component: SmtpConfigPage,
})
