import type {
  Activity, AttemptResult, Child, Health, Progress, ReadCheck, Report, ScreeningSession, SessionSummary, User,
} from './types'

const BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'lexora.token'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const token = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } },
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const t = token.get()
  if (t) headers.set('Authorization', `Bearer ${t}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  let res: Response
  try {
    res = await fetch(BASE + path, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Cannot reach the Lexora API. Is the backend running on port 8000?')
  }
  if (res.status === 401 && !path.startsWith('/api/auth/login')) {
    token.clear()
    window.dispatchEvent(new Event('lexora:logout'))
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail ?? body)
    } catch { /* non-JSON error */ }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const json = (data: unknown) => JSON.stringify(data)

export const api = {
  health: () => request<Health>('/api/health'),
  demoAccounts: () => request<{ enabled: boolean; password?: string; accounts?: { role: string; email: string }[] }>('/api/demo-accounts'),
  validation: () => request<Record<string, unknown>>('/api/validation'),

  login: (email: string, password: string) => {
    const body = new URLSearchParams({ username: email, password })
    return request<{ access_token: string; user: User }>('/api/auth/login', {
      method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
  register: (data: { email: string; password: string; full_name: string; role: 'teacher' | 'parent' }) =>
    request<{ access_token: string; user: User }>('/api/auth/register', { method: 'POST', body: json(data) }),
  me: () => request<User>('/api/auth/me'),

  children: () => request<Child[]>('/api/children'),
  child: (id: number) => request<Child>(`/api/children/${id}`),
  createChild: (data: Record<string, unknown>) =>
    request<{ child: Child; child_login: { email: string; pin: string } }>('/api/children', { method: 'POST', body: json(data) }),
  updateChild: (id: number, data: Record<string, unknown>) => request<Child>(`/api/children/${id}`, { method: 'PUT', body: json(data) }),
  childSessions: (id: number) => request<SessionSummary[]>(`/api/children/${id}/sessions`),

  createScreening: (child_id: number) => request<ScreeningSession>('/api/screenings', { method: 'POST', body: json({ child_id }) }),
  screening: (id: number) => request<ScreeningSession>(`/api/screenings/${id}`),
  discardScreening: (id: number) => request<void>(`/api/screenings/${id}`, { method: 'DELETE' }),
  submitText: (sid: number, tid: number, response_text: string) =>
    request<ScreeningSession>(`/api/screenings/${sid}/tasks/${tid}/text`, { method: 'POST', body: json({ response_text }) }),
  submitAudio: (sid: number, tid: number, blob: Blob, filename: string, duration?: number) => {
    const fd = new FormData()
    fd.append('file', blob, filename)
    if (duration !== undefined) fd.append('duration_seconds', String(duration))
    return request<ScreeningSession>(`/api/screenings/${sid}/tasks/${tid}/audio`, { method: 'POST', body: fd })
  },
  markItem: (sid: number, tid: number, data: { correct: boolean; mistakes?: number; duration_seconds?: number }) =>
    request<ScreeningSession>(`/api/screenings/${sid}/tasks/${tid}/mark`, { method: 'POST', body: json(data) }),
  correctTranscript: (sid: number, tid: number, transcript: string) =>
    request<ScreeningSession>(`/api/screenings/${sid}/tasks/${tid}/transcript`, { method: 'POST', body: json({ transcript }) }),
  demoFill: (sid: number) => request<ScreeningSession>(`/api/screenings/${sid}/demo-fill`, { method: 'POST' }),
  complete: (sid: number) => request<Report>(`/api/screenings/${sid}/complete`, { method: 'POST' }),
  report: (sid: number) => request<Report>(`/api/screenings/${sid}/report`),

  practice: (child_id: number) => request<Activity[]>(`/api/practice?child_id=${child_id}`),
  activity: (id: number) => request<Activity>(`/api/practice/${id}`),
  generatePractice: (child_id: number, session_id?: number) =>
    request<Activity[]>('/api/practice/generate', { method: 'POST', body: json({ child_id, session_id }) }),
  submitAttempt: (id: number, answers: Record<string, unknown>) =>
    request<AttemptResult>(`/api/practice/${id}/attempts`, { method: 'POST', body: json({ answers }) }),
  skills: () => request<Record<string, string>>('/api/practice/skills'),
  readCheck: (id: number, index: number, blob: Blob, filename: string) => {
    const fd = new FormData()
    fd.append('index', String(index))
    fd.append('file', blob, filename)
    return request<ReadCheck>(`/api/practice/${id}/read-check`, { method: 'POST', body: fd })
  },

  progress: (child_id: number) => request<Progress>(`/api/progress/${child_id}`),
}
