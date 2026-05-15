import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'
import './i18n' // DPDP §6 — privacy notice in EN + HI

// Error tracking. No-op if VITE_SENTRY_DSN is not configured.
// For DPDP-aligned deploys, use a Sentry EU project DSN
// (https://...@o....ingest.de.sentry.io/...) — region is encoded in the
// DSN itself; no extra config needed here.
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE_SHA as string | undefined,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
  })
}

createRoot(document.getElementById("root")!).render(<App />);
