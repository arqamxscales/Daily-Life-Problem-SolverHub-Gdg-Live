export type Priority = 'low' | 'medium' | 'high'

export interface ProblemInput {
  problem: string
  context: string
  priority: Priority
  hoursPerWeek: number
  deadlineDays: number
}

export interface PlanStep {
  title: string
  detail: string
  effortHours: number
  dueInDays: number
}

export interface DailySlot {
  day: string
  focus: string
  durationMinutes: number
}

export interface GeneratedPlan {
  summary: string
  quickWin: string
  steps: PlanStep[]
  schedule: DailySlot[]
  risks: string[]
}

export interface PlanRecord {
  id: string
  anonymousId: string
  createdAt: string
  input: ProblemInput
  output: GeneratedPlan
}

export type AgentMode = 'planner' | 'coach' | 'critic' | 'scheduler'

export interface ChatMessage {
  id: string
  threadId: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
}

export interface ChatThread {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}
