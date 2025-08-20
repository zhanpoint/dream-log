import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global/main.css'
import 'react-day-picker/dist/style.css'
import { RouterProvider } from 'react-router-dom'
import router from './routes'
import { Toaster } from "@/components/ui/sonner.jsx"

// 强制使用暗色主题
document.documentElement.classList.add('dark');

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <RouterProvider router={router} />
    <Toaster position="top-center" richColors closeButton />
  </>,
)
