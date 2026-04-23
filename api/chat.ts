import { createModel, modeInstruction } from './_shared'
import type { AgentMode, ApiRequest, ApiResponse } from './_shared'

function cleanText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body ?? {}
    const mode = (body.mode as AgentMode | undefined) ?? 'planner'
    const question = String(body.question ?? '')
    const input = body.input ?? null
    const plan = body.plan ?? null
    const history = Array.isArray(body.history) ? body.history.slice(-8) : []

    const latestHistory = history.map((message: { role: string; text: string }) => `${message.role.toUpperCase()}: ${message.text}`).join('\n')

    const prompt = `${modeInstruction(mode)}

You are inside a Daily Life Problem Solver app.
Keep answers concise, practical, and specific.

Current problem input JSON:
${JSON.stringify(input)}

Current plan JSON:
${JSON.stringify(plan)}

Conversation context:
${latestHistory}

User question:
${question}

Return plain text only.`

    const model = createModel()
    const response = await model.generateContent(prompt)
    return res.status(200).json({ text: cleanText(response.response.text()) })
  } catch {
    return res.status(500).json({ error: 'Failed to generate response' })
  }
}
