import { createBrowserRouter } from 'react-router'
import { RootLayout } from './layouts/RootLayout'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteErrorPage } from './pages/RouteErrorPage'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        index: true,
        // Stand-in until the app shell takes over this path.
        element: <p className="p-8">Relay web client</p>,
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
])