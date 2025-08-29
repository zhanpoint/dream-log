import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './Index.css'
import './styles/global/main.css'
import 'react-day-picker/style.css'
import { RouterProvider } from 'react-router-dom'
import router from './routes'
import { Toaster } from "@/components/ui/sonner.jsx"

// 应用加载组件
const AppLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center space-y-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">Dream Log</h2>
        <p className="text-sm text-muted-foreground">正在启动...</p>
      </div>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <Suspense fallback={<AppLoader />}>
    <RouterProvider router={router} />
    <Toaster position="top-center" richColors closeButton />
  </Suspense>,
)
