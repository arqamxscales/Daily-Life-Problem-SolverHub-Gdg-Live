import { GoogleGenerativeAI } from '@google/generative-ai'

export type AgentMode = 'planner' | 'coach' | 'critic' | 'scheduler'

export interface ProblemInput {
  problem: string
  context: string
  priority: 'low' | 'medium' | 'high'
  hoursPerWeek: number
  deadlineDays: number
}

export interface GeneratedPlan {
  summary: string
  quickWin: string
  steps: Array<{ title: string; detail: string; effortHours: number; dueInDays: number }>
  schedule: Array<{ day: string; focus: string; durationMinutes: number }>
  risks: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

export interface ApiRequest {
  method?: string
  body?: Record<string, unknown>
}

export interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (payload: unknown) => ApiResponse
  setHeader: (name: string, value: string) => void
  write: (chunk: string) => void
  end: () => void
}

export function createModel() {
  const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  const key = env.GEMINI_API_KEY
  if (!key) {
    throw new Error('Missing GEMINI_API_KEY')
  }

  const modelName = env.GEMINI_MODEL ?? 'gemini-2.5-flash'
  const client = new GoogleGenerativeAI(key)
  return client.getGenerativeModel({ model: modelName })
}

export function modeInstruction(mode: AgentMode) {
  if (mode === 'coach') {
    return 'Act like a motivational accountability coach. Push toward immediate action with empathy.'
  }

  if (mode === 'critic') {
    return 'Act like a pragmatic critic. Identify weak assumptions and suggest safer alternatives.'
  }

  if (mode === 'scheduler') {
    return 'Act like a time-management architect. Focus on calendar-ready schedules and realistic sequencing.'
  }

  return 'Act like a strategic planner. Convert goals into clear execution steps.'
}

export function parseJsonCandidate(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model did not return JSON')
  }

  return JSON.parse(text.slice(start, end + 1)) as GeneratedPlan
}

export function normalizePlan(raw: GeneratedPlan): GeneratedPlan {
  return {
    summary: raw.summary,
    quickWin: raw.quickWin,
    steps: (raw.steps ?? []).map((step) => ({
      title: step.title,
      detail: step.detail,
      effortHours: Math.max(1, Math.round(step.effortHours || 1)),
      dueInDays: Math.max(1, Math.round(step.dueInDays || 1)),
    })),
    schedule: (raw.schedule ?? []).map((slot) => ({
      day: slot.day,
      focus: slot.focus,
      durationMinutes: Math.max(10, Math.round(slot.durationMinutes || 20)),
    })),
    risks: Array.isArray(raw.risks) ? raw.risks : [],
  }
}
