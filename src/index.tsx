import React from 'react'
import axios, { AxiosError, AxiosResponse } from 'axios'
import ReactDOM from 'react-dom/client'
import store, { useAppDispatch, useAppSelector } from '@state/store'
import { Provider as ReduxProvider } from 'react-redux'
import { ToastContainer, Flip } from 'react-toastify'
import { init } from '@module-federation/enhanced/runtime'

// Initialize Module Federation runtime
// Use dynamic origin based on current window.location for production deployments
init({
  name: 'host',
  remotes: [],
})
import App from './app'

// styles
import 'react-toastify/dist/ReactToastify.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import '@ynput/ayon-react-components/dist/style.css'
// Light overrides for the design system's compiled PrimeReact dark theme. Its
// selectors carry zero extra specificity, so ORDER decides: it must sit after
// the design system and before the app's own overrides below, which still win.
import './styles/primereact-light.generated.css'
import './styles/loadingShimmer.scss'
import './styles/index.scss'
// token definitions, outrank the design system's :root on specificity alone
import './styles/themes.scss'
import 'react-perfect-scrollbar/dist/css/styles.css'

import short from 'short-uuid'
import { SocketProvider } from '@shared/context'

// generate unique session id
declare global {
  interface Window {
    senderId: string
  }
}

window.senderId = short.generate()

axios.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    // Handle cases where response might not exist
    if (
      error.response?.status === 401 &&
      window.location.pathname !== '/' &&
      !window.location.pathname.startsWith('/login')
    ) {
      window.location.href = '/'
    }
    return Promise.reject(error)
  },
)

// toasts render outside App, so they read the theme straight off the store
const ThemedToastContainer = () => {
  const theme = useAppSelector((state) => state.theme.resolved)
  return (
    <ToastContainer
      position="bottom-right"
      transition={Flip}
      theme={theme}
      pauseOnFocusLoss={false}
      newestOnTop={false}
      draggable={false}
      closeOnClick={true}
      autoClose={5000}
      limit={5}
    />
  )
}

// wrap socket provider so we can pass the correct props
const SocketProviderWrapper = (props: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch()
  const projectName = useAppSelector((state) => state.project.name) as unknown as string
  const userName = useAppSelector((state) => state.user.name)
  return (
    <SocketProvider userName={userName} projectName={projectName} dispatch={dispatch}>
      {props.children}
    </SocketProvider>
  )
}

/**
 * Render Application
 *
 * Rendering the root component of the application inside the element with id 'root'.
 * Wrapping the App component with ReduxProvider and SocketProvider.
 * Including ToastContainer for toast notifications.
 */
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ReduxProvider store={store}>
      <SocketProviderWrapper>
        <div id="root-header" className={import.meta.env.DEV ? 'DEV' : ''} />
        <App />
        <ThemedToastContainer />
      </SocketProviderWrapper>
    </ReduxProvider>
  </React.StrictMode>,
)
