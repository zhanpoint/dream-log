import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global/main.css'
import 'react-day-picker/dist/style.css'
import { RouterProvider } from 'react-router-dom'
import router from './routes'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from "@/components/ui/sonner.jsx"

// 强制使用暗色主题
document.documentElement.classList.add('dark');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton />
    </AuthProvider>
  </React.StrictMode>,
)
