import { createBrowserRouter } from 'react-router'
import { RootLayout } from './layouts/RootLayout'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteErrorPage } from './pages/RouteErrorPage'
import { DevUiPage } from './pages/DevUiPage'

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
      // The gallery only exists in development. In a production build this branch is
      // removed completely, so the page is not even shipped.
      ...(import.meta.env.DEV
        ? [{ path: '_dev/ui', Component: DevUiPage }]
        : []),
      { path: '*', Component: NotFoundPage },
    ],
  },
])