import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fontes servidas pelo próprio site (antes vinham do Google Fonts), para a
// interface ficar igual também offline. Só o subconjunto latino (português).
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/playfair-display/latin-700.css'
import '@fontsource/playfair-display/latin-700-italic.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import './index.css'
import App from './App.tsx'
import { registerOffline } from './core/offline.ts'

registerOffline()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
