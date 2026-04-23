import type { DailySlot, GeneratedPlan, PlanStep, ProblemInput } from '../types'

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function buildSteps(input: ProblemInput): PlanStep[] {
  const baseHours = clamp(Math.round(input.hoursPerWeek / 2), 1, 6)
  const deadline = clamp(input.deadlineDays, 3, 60)

  return [
    {
      title: 'Clarify the target outcome',
      detail: `Write one measurable outcome for: ${input.problem.slice(0, 120)}.`,
      effortHours: 1,
      dueInDays: 1,
    },
    {
      title: 'Break into micro-tasks',
      detail: 'Create 3 to 5 actions that can be done in under 60 minutes.',
      effortHours: baseHours,
      dueInDays: clamp(Math.round(deadline * 0.3), 2, 14),
    },
    {
      title: 'Execute with time blocks',
      detail: `Reserve ${input.hoursPerWeek}h/week and track completion daily.`,
      effortHours: input.hoursPerWeek,
      dueInDays: clamp(Math.round(deadline * 0.7), 4, 40),
    },
    {
      title: 'Review and adjust',
      detail: 'At week end, keep what works and replace one weak step.',
      effortHours: 1,
      dueInDays: deadline,
    },
  ]
}

function buildSchedule(input: ProblemInput): DailySlot[] {
  const perDayMinutes = clamp(Math.round((input.hoursPerWeek * 60) / 5), 20, 120)
  return WEEK_DAYS.map((day, index) => ({
    day,
    focus:
      index === 0
        ? 'Define and prioritize'
        : index < 4
          ? 'Deep execution block'
          : index === 4
            ? 'Review progress'
            : 'Recovery or catch-up',
    durationMinutes: index < 5 ? perDayMinutes : Math.round(perDayMinutes / 2),
  }))
}

export function buildFallbackPlan(input: ProblemInput): GeneratedPlan {
  const urgencyLabel = input.priority === 'high' ? 'urgent' : input.priority === 'medium' ? 'important' : 'steady'

  return {
    summary: `A ${urgencyLabel} plan focused on practical daily actions to solve your problem within ${input.deadlineDays} days.`,
    quickWin: 'Do a 20-minute starter task today to reduce friction and build momentum.',
    steps: buildSteps(input),
    schedule: buildSchedule(input),
    risks: [
      'Inconsistent daily execution.',
      'Over-planning instead of doing.',
      'Unrealistic scope for available hours.',
    ],
  }
}
