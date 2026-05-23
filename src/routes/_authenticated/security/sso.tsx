import { createFileRoute } from '@tanstack/react-router'
import { SsoConfigPage } from '@/pages/security/sso-config'

export const Route = createFileRoute('/_authenticated/security/sso')({
  component: SsoConfigPage,
})
