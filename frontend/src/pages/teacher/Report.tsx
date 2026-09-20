import { Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReportView from '../../components/ReportView'
import { ErrorBox, PageHeader, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { Report } from '../../lib/types'

export default function ReportPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const base = user?.role === 'parent' ? '/parent' : '/teacher'
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = () => api.report(Number(id)).then(setReport).catch((e) => setError(e.message))
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id])

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!report) return <Spinner label="Loading report…" />
  const childHref = user?.role === 'parent' ? `/parent/child/${report.child.id}` : `/teacher/children/${report.child.id}`
  return (
    <div>
      <PageHeader eyebrow="Screening report" title={`${report.child.first_name}’s screening report`}
        subtitle="Observed patterns → screening indicator. Not a clinical diagnosis."
        actions={<><Link to={childHref} className="btn-ghost">Back to {report.child.first_name}</Link><button className="btn-secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />Print / PDF</button></>} />
      <ReportView report={report} practiceHref={`${base}/practice/${report.child.id}?session=${report.session_id}`}
        onRemark={user?.role === 'teacher' ? async (taskId, correct) => {
          try { await api.markItem(report.session_id, taskId, { correct, mistakes: correct ? 0 : 1 }); await load() }
          catch (e) { setError((e as Error).message) }
        } : undefined} />
    </div>
  )
}
