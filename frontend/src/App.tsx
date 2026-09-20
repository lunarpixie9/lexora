import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell, RequireRole } from './components/Layout'
import { Spinner } from './components/ui'
import { AuthProvider } from './lib/auth'
import Landing from './pages/Landing'
import Login from './pages/Login'

// Pages are code-split so the landing/login shell loads fast; Recharts and the
// report/progress views only download when a signed-in user opens them.
const Methodology = lazy(() => import('./pages/Methodology'))
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'))
const Children = lazy(() => import('./pages/teacher/Children'))
const ChildDetail = lazy(() => import('./pages/teacher/ChildDetail'))
const PracticePage = lazy(() => import('./pages/teacher/Practice'))
const ReportPage = lazy(() => import('./pages/teacher/Report'))
const NewScreening = lazy(() => import('./pages/teacher/Screening').then((m) => ({ default: m.NewScreening })))
const RunScreening = lazy(() => import('./pages/teacher/Screening').then((m) => ({ default: m.RunScreening })))
const ParentDashboard = lazy(() => import('./pages/parent/Dashboard').then((m) => ({ default: m.ParentDashboard })))
const ParentProgress = lazy(() => import('./pages/parent/Dashboard').then((m) => ({ default: m.ParentProgress })))
const ChildHome = lazy(() => import('./pages/child/ChildPages').then((m) => ({ default: m.ChildHome })))
const ChildScreeningEntry = lazy(() => import('./pages/child/ChildPages').then((m) => ({ default: m.ChildScreeningEntry })))
const ChildScreening = lazy(() => import('./pages/child/ChildPages').then((m) => ({ default: m.ChildScreening })))
const ChildPractice = lazy(() => import('./pages/child/ChildPages').then((m) => ({ default: m.ChildPractice })))
const ChildActivity = lazy(() => import('./pages/child/ChildPages').then((m) => ({ default: m.ChildActivity })))
const ChildProgress = lazy(() => import('./pages/child/ChildPages').then((m) => ({ default: m.ChildProgress })))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Spinner label="Loading…" />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<Navigate to="/how-it-works" replace />} />
          <Route path="/how-it-works" element={<Methodology />} />
          <Route path="/login" element={<Login />} />

          {/* Teacher */}
          <Route element={<RequireRole roles={['teacher']} />}>
            <Route element={<AppShell />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/children" element={<Children />} />
              <Route path="/teacher/children/:id" element={<ChildDetail />} />
              <Route path="/teacher/screening/new" element={<NewScreening />} />
              <Route path="/teacher/screening/:id" element={<RunScreening />} />
              <Route path="/teacher/reports/:id" element={<ReportPage />} />
              <Route path="/teacher/practice/:id" element={<PracticePage />} />
            </Route>
          </Route>

          {/* Parent */}
          <Route element={<RequireRole roles={['parent']} />}>
            <Route element={<AppShell />}>
              <Route path="/parent/dashboard" element={<ParentDashboard />} />
              <Route path="/parent/child/:id" element={<ChildDetail />} />
              <Route path="/parent/progress/:id" element={<ParentProgress />} />
              <Route path="/parent/reports/:id" element={<ReportPage />} />
              <Route path="/parent/practice/:id" element={<PracticePage />} />
            </Route>
          </Route>

          {/* Child */}
          <Route element={<RequireRole roles={['child']} />}>
            <Route element={<AppShell />}>
              <Route path="/child/home" element={<ChildHome />} />
              <Route path="/child/screening" element={<ChildScreeningEntry />} />
              <Route path="/child/screening/:id" element={<ChildScreening />} />
              <Route path="/child/reading" element={<Navigate to="/child/screening" replace />} />
              <Route path="/child/writing" element={<Navigate to="/child/screening" replace />} />
              <Route path="/child/speech" element={<Navigate to="/child/screening" replace />} />
              <Route path="/child/practice" element={<ChildPractice />} />
              <Route path="/child/practice/:id" element={<ChildActivity />} />
              <Route path="/child/progress" element={<ChildProgress />} />
            </Route>
          </Route>

          {/* Shared, authenticated */}
          <Route element={<RequireRole roles={['teacher', 'parent', 'child']} />}>
            <Route element={<AppShell />}>
              <Route path="/methodology" element={<Methodology />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
