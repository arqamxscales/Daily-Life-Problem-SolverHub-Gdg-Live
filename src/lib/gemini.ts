import type { GeneratedPlan, ProblemInput } from '../types'

export async function generateGeminiPlan(input: ProblemInput) {
  const response = await fetch('/api/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  })

  if (!response.ok) {
    throw new Error('Plan generation failed')
  }

  const data = (await response.json()) as { plan: GeneratedPlan }
  return data.plan
}
