import type { ChatMessage, ChatThread, PlanRecord } from '../types'

const ANON_ID_KEY = 'dlps_anon_id'
const HISTORY_KEY = 'dlps_history'
const CHAT_KEY_PREFIX = 'dlps_chat_'
const THREADS_KEY_PREFIX = 'dlps_threads_'

export function getAnonymousId() {
  const existing = localStorage.getItem(ANON_ID_KEY)
  if (existing) {
    return existing
  }

  const id = crypto.randomUUID()
  localStorage.setItem(ANON_ID_KEY, id)
  return id
}

export function loadLocalHistory() {
  const raw = localStorage.getItem(HISTORY_KEY)
  if (!raw) {
    return [] as PlanRecord[]
  }

  try {
    const parsed = JSON.parse(raw) as PlanRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [] as PlanRecord[]
  }
}

export function savePlanToLocal(record: PlanRecord) {
  const current = loadLocalHistory()
  const next = [record, ...current].slice(0, 20)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  return next
}

function chatKey(identity: string, threadId: string) {
  return `${CHAT_KEY_PREFIX}${identity}_${threadId}`
}

function threadKey(identity: string) {
  return `${THREADS_KEY_PREFIX}${identity}`
}

export function loadLocalChatThreads(identity: string) {
  const raw = localStorage.getItem(threadKey(identity))
  if (!raw) {
    return [] as ChatThread[]
  }

  try {
    const parsed = JSON.parse(raw) as ChatThread[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [] as ChatThread[]
  }
}

export function saveLocalChatThreads(identity: string, threads: ChatThread[]) {
  localStorage.setItem(threadKey(identity), JSON.stringify(threads))
  return threads
}

export function loadLocalChatMemory(identity: string, threadId: string) {
  const raw = localStorage.getItem(chatKey(identity, threadId))
  if (!raw) {
    return [] as ChatMessage[]
  }

  try {
    const parsed = JSON.parse(raw) as ChatMessage[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [] as ChatMessage[]
  }
}

export function saveLocalChatMemory(identity: string, threadId: string, messages: ChatMessage[]) {
  const trimmed = messages.slice(-120)
  localStorage.setItem(chatKey(identity, threadId), JSON.stringify(trimmed))
  return trimmed
}
