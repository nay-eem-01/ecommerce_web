import { Route, Routes } from 'react-router-dom'
import { NotFoundPage } from './features/errors/NotFoundPage'
import { AppLayout } from './layout/AppLayout'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
