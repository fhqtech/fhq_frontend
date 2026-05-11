import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'

// H3: Error tracking. No-op if VITE_SENTRY_DSN is not configured.
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
  })
}

createRoot(document.getElementById("root")!).render(<App />);
