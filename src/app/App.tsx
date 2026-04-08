import useRouteElement from '../useRouteElement'
import { ToastContainer } from 'react-toastify'

function App() {
  const routeElements = useRouteElement()
  return (
    <>
      {routeElements} <ToastContainer />
    </>
  )
}

export default App
