import { Buffer } from 'buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Polyfill for @react-pdf/renderer (uses Node's Buffer)
;(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

