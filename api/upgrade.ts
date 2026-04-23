import { createModel, modeInstruction, normalizePlan, parseJsonCandidate } from './_shared'
import type { ApiRequest, ApiResponse, AgentMode } from './_shared'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body ?? {}
    const mode = (body.mode as AgentMode | undefined) ?? 'planner'
    const input = body.input ?? {}
    const plan = body.plan ?? {}

    const prompt = `${modeInstruction(mode)}

Upgrade this plan. Keep the same JSON shape:
{
  "summary": string,
  "quickWin": string,
  "steps": [{"title": string, "detail": string, "effortHours": number, "dueInDays": number}],
  "schedule": [{"day": string, "focus": string, "durationMinutes": number}],
  "risks": string[]
}

Rules:
- Keep it realistic.
- Improve specificity.
- Steps should be 4 to 6.
- Schedule should have 7 items.
- Return valid JSON only.

Problem input:
${JSON.stringify(input)}

Current plan:
${JSON.stringify(plan)}
`

    const model = createModel()
    const response = await model.generateContent(prompt)
    const parsed = parseJsonCandidate(response.response.text())

    return res.status(200).json({ plan: normalizePlan(parsed) })
  } catch {
    return res.status(500).json({ error: 'Failed to upgrade plan' })
  }
}
