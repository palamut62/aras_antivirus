import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { installTauriAdapter } from './lib/tauriAdapter'

// Install the Tauri adapter so window.moleAPI works for the existing renderer.
// If we're running under the legacy Electron preload, moleAPI already exists and we skip.
const hasMoleApi = !!(window as any).moleAPI
const isTauriRuntime = typeof (window as any).__TAURI_INTERNALS__ !== 'undefined'

if (!hasMoleApi && isTauriRuntime) {
  installTauriAdapter()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
