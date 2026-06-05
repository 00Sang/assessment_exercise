import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FrappeProvider } from 'frappe-react-sdk'
import { Toaster } from '@/components/ui/sonner'
import App from './App.tsx'
import './index.css'

const DEFAULT_FRAPPE_URL = 'http://localhost:8000'
const configuredFrappeUrl = import.meta.env.VITE_FRAPPE_URL ?? DEFAULT_FRAPPE_URL
const frappeUrl = import.meta.env.DEV ? '' : configuredFrappeUrl
const frappeSiteName =
  import.meta.env.VITE_FRAPPE_SITE_NAME ??
  new URL(configuredFrappeUrl).hostname
const frappeCustomHeaders = {
  'X-Frappe-Site-Name': frappeSiteName,
} as const
const rawSocketPort = import.meta.env.VITE_FRAPPE_SOCKET_PORT
const socketPort = rawSocketPort && rawSocketPort.trim().length > 0 ? rawSocketPort : undefined
const enableSocket = import.meta.env.VITE_ENABLE_SOCKET !== 'false'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FrappeProvider
      url={frappeUrl}
      siteName={frappeSiteName}
      customHeaders={frappeCustomHeaders}
      socketPort={socketPort}
      enableSocket={enableSocket}
    >
      <App />
      <Toaster richColors position="top-right" />
    </FrappeProvider>
  </StrictMode>,
)
