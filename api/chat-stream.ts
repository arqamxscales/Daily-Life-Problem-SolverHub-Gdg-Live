import { createModel, modeInstruction } from './_shared'
import type { AgentMode, ApiRequest, ApiResponse } from './_shared'

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
    const result = await model.generateContentStream(prompt)

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        res.write(text)
      }
    }

    return res.end()
  } catch {
    return res.status(500).json({ error: 'Failed to stream response' })
  }
}
