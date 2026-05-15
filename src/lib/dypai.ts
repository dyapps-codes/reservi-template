/// <reference types="vite/client" />
import { createClient } from '@dypai-ai/client-sdk'
import { appConfig } from './app-config'

const dypaiUrl = import.meta.env.VITE_DYPAI_URL

if (!dypaiUrl) {
  throw new Error('Missing VITE_DYPAI_URL. Set it in .env before starting the app.')
}

export const dypai = createClient(dypaiUrl, {
  redirects: {
    passwordRecovery: appConfig.passwordRecoveryPath,
    signIn: appConfig.homePath,
  },
})
