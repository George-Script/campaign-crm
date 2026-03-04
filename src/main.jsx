// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background:  '#0F1A2B',
            color:       '#EEF2F8',
            border:      '1px solid #1E2F45',
            fontFamily:  "'DM Sans', sans-serif",
            fontSize:    '13px',
            borderRadius:'10px',
          },
          success: { iconTheme: { primary: '#00D084', secondary: '#080C12' } },
          error:   { iconTheme: { primary: '#FF4D6D', secondary: '#fff'   } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)