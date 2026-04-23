import type { AgentMode, ChatMessage, GeneratedPlan, ProblemInput } from '../types'

interface AssistantReplyArgs {
  mode: AgentMode
  question: string
  input: ProblemInput | null
  plan: GeneratedPlan | null
  history: ChatMessage[]
}

interface UpgradePlanArgs {
  mode: AgentMode
  input: ProblemInput
  plan: GeneratedPlan
}

interface StreamArgs {
  mode: AgentMode
  question: string
  input: ProblemInput | null
  plan: GeneratedPlan | null
  history: ChatMessage[]
  onChunk: (chunk: string) => void
}

export async function generateAssistantReply({ mode, question, input, plan, history }: AssistantReplyArgs) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode, question, input, plan, history }),
  })

  if (!response.ok) {
    throw new Error('Chat request failed')
  }

  const data = (await response.json()) as { text: string }
  return data.text
}

export async function streamAssistantReply({ mode, question, input, plan, history, onChunk }: StreamArgs) {
  const response = await fetch('/api/chat-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode, question, input, plan, history }),
  })

  if (!response.ok || !response.body) {
    throw new Error('Streaming request failed')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    const chunk = decoder.decode(value, { stream: true })
    if (chunk) {
      onChunk(chunk)
    }
  }
}

export async function upgradePlanWithAgent({ mode, input, plan }: UpgradePlanArgs) {
  const response = await fetch('/api/upgrade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode, input, plan }),
  })

  if (!response.ok) {
    throw new Error('Plan upgrade failed')
  }

  const data = (await response.json()) as { plan: GeneratedPlan }
  return data.plan
}
