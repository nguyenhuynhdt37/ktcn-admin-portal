import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { router } from '@/app/router'
import { AppProviders } from '@/app/providers'
import '@/styles/globals.css'

dayjs.locale('vi')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>
)
