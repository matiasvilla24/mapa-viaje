import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import 'leaflet/dist/leaflet.css'
import { registerSW } from 'virtual:pwa-register'

// Service worker de la PWA (auto-update: cuando hay una versión nueva la
// activa apenas todos los Tabs la hayan cargado)
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
