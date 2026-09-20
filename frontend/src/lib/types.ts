export type Role = 'teacher' | 'parent' | 'child'

export interface User {
  id: number
  email: string
  full_name: string
  role: Role
}

export interface Child {
  id: number
  first_name: string
  age: number
  class_grade: number
  home_language: string
  notes: string
  is_demo: boolean
  teacher_id: number
  parent_id: number | null
  child_user_id: number | null
  created_at: string
  latest_band: string | null
  latest_score: number | null
  sessions_completed: number
  child_login_email: string | null
}

export interface TaskResponse {
  id: number
  response_text: string | null
  has_audio: boolean
  examiner_correct: boolean | null
  duration_seconds: number | null
  submitted_at: string
  text?: {
    accuracy: number
    word_error_rate: number
    spelling_error_count: number
    pattern_counts: Record<string, number>
    word_errors: WordError[]
  }
  speech?: {
    engine: string
    transcript: string
    item_correct: boolean | null
    word_error_rate: number | null
    words_per_minute: number | null
    long_pauses: number | null
    duration_seconds: number | null
  }
}

export interface WordError {
  expected: string | null
  actual: string | null
  patterns: string[]
  edit_distance?: number
}

export interface Task {
  id: number
  kind: 'reading' | 'writing' | 'speech'
  order_index: number
  item_level: string
  prompt_text: string
  prompt_source: string
  status: 'pending' | 'answered' | 'skipped'
  response: TaskResponse | null
}

export interface ScreeningSession {
  id: number
  child_id: number
  child_name: string
  status: 'in_progress' | 'completed'
  mode: 'live' | 'demo'
  started_at: string
  completed_at: string | null
  tasks: Task[]
  progress: { total: number; answered: number; skipped: number; pending: number }
  has_result: boolean
}

export interface SessionSummary {
  id: number
  child_id: number
  status: string
  mode: string
  started_at: string
  completed_at: string | null
  score: number | null
  band: string | null
}

export interface Signal {
  name: string
  label: string
  group: 'reading' | 'writing' | 'speech'
  value: number
  raw_value: string
  weight: number
  contribution: number
  note: string
}

export interface ShapRow {
  feature: string
  label: string
  value: number
  shap: number
}

export interface Report {
  session_id: number
  child: { id: number; first_name: string; age: number; class_grade: number; is_demo: boolean }
  generated_at: string
  indicator: {
    score: number
    band: string
    band_label: string
    signals: Signal[]
    groups_present: string[]
    version: string
    session_mode: string
  }
  features: Signal[]
  reading: {
    level?: string
    expected_level_for_class?: string
    gap_levels?: number
    probabilities?: Record<string, number> | null
    shap?: ShapRow[]
    engine?: string
    class_grade?: number
    accuracy_CL?: number | null
    accuracy_SL?: number | null
    accuracy_W?: number | null
    accuracy_S?: number | null
    items?: { task_id?: number; level: string; prompt: string; correct: boolean | null; seconds: number | null; engine: string | null; transcript: string | null }[]
  }
  writing: {
    total_words?: number
    correct_words?: number
    accuracy?: number
    word_error_rate?: number
    pattern_counts?: Record<string, number>
    items?: { prompt: string; answer: string; accuracy: number; word_errors: WordError[] }[]
  }
  speech: {
    engine?: string
    transcript?: string
    prompt?: string
    duration_seconds?: number
    expected_words?: number
    recognized_words?: number
    word_error_rate?: number
    words_per_minute?: number
    wpm_reference?: number
    long_pauses?: number
    long_pauses_per_10_words?: number
    word_errors?: WordError[]
  }
  error_profile: {
    patterns: Record<string, number>
    letters_missed: string[]
    words_missed: string[]
    target_skills: string[]
  }
  narrative: string[]
  previous: { session_id: number; date: string; score: number; band: string; reading_level: string; score_change: number } | null
  disclaimer: string
  model_version: string
  data_sources: string[]
}

export interface WordChoiceItem { prompt: string; options: string[]; answer: string }
export interface SpellingItem { word: string; hint: string }
export interface ReadingItem { sentence: string }
export interface StoryQuestion { question: string; options: string[]; answer: string }

export interface ActivityContent {
  kind: 'word_practice' | 'spelling' | 'reading' | 'story'
  title: string
  instructions: string
  target_skills: string[]
  word_choice: WordChoiceItem[]
  spelling: SpellingItem[]
  reading: ReadingItem[]
  story_text: string
  questions: StoryQuestion[]
}

export interface Activity {
  id: number
  child_id: number
  session_id: number | null
  kind: ActivityContent['kind']
  title: string
  target_skills: string[]
  content: ActivityContent
  source: 'deterministic' | 'gemini'
  created_at: string
  attempt_count: number
  best_score: number | null
}

export interface AttemptResult {
  id: number
  activity_id: number
  score: number
  correct: number
  total: number
  feedback: { index: number; expected?: string; given?: string; correct: boolean; patterns?: string[] }[]
  completed_at: string
}

export interface Progress {
  child_id: number
  screenings: {
    session_id: number
    date: string
    mode: string
    score: number
    band: string
    reading_level: string
    expected_level: string
    reading_accuracy: number | null
    spelling_accuracy: number | null
    words_per_minute: number | null
    groups: Record<string, number>
  }[]
  practice: { attempt_id: number; activity_id: number; date: string; kind: string; title: string; score: number; skills: string[] }[]
  skills: Record<string, { label: string; attempts: number; average: number; latest: number; trend: number }>
}

export interface Health {
  status: string
  database: { ok: boolean; backend: string }
  whisper: { state: string; model: string | null }
  reading_level_model: string
  practice_generator: string
  demo_seeded: boolean
}
