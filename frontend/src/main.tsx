import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './font-fallbacks.css'
import './index.css'
import App from './App'
import { preloadRoute } from './routes'
import { loadFonts } from './lib/fonts'

// render once the opened page's chunk is in, so it appears without a loading fallback
preloadRoute(location.pathname).then(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
})
loadFonts()
