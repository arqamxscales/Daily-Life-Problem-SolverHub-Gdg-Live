import { createModel, normalizePlan, parseJsonCandidate } from './_shared'
import type { ApiRequest, ApiResponse } from './_shared'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body ?? {}
    const input = (body.input ?? {}) as {
      problem?: string
      context?: string
      priority?: string
      hoursPerWeek?: number
      deadlineDays?: number
    }
    const prompt = `You are a practical daily-life problem solving assistant.

Return valid JSON only, no markdown. Follow this exact TypeScript shape:
{
  "summary": string,
  "quickWin": string,
  "steps": [{"title": string, "detail": string, "effortHours": number, "dueInDays": number}],
  "schedule": [{"day": string, "focus": string, "durationMinutes": number}],
  "risks": string[]
}

Rules:
- Steps should be 4 to 6.
- Schedule should be 7 items (Mon..Sun).
- Be concise and specific.
- Use realistic effort values.

Problem:
${input.problem}

Context:
${input.context || 'No extra context provided.'}

Priority: ${input.priority}
Available hours per week: ${input.hoursPerWeek}
Deadline in days: ${input.deadlineDays}
`

    const model = createModel()
    const response = await model.generateContent(prompt)
    const parsed = parseJsonCandidate(response.response.text())

    return res.status(200).json({ plan: normalizePlan(parsed) })
  } catch {
    return res.status(500).json({ error: 'Failed to generate plan' })
  }
}
