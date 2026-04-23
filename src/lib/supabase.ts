import { createClient, type Session } from '@supabase/supabase-js'
import { env, hasSupabase } from './env'
import type { ChatMessage, ChatThread, PlanRecord } from '../types'

const PLAN_TABLE = 'problem_plans'
const THREAD_TABLE = 'chat_threads'
const CHAT_TABLE = 'chat_messages'

const supabase = hasSupabase
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'dlps_auth_session',
      },
    })
  : null

export function getSupabaseClient() {
  return supabase
}

export async function getCurrentSession() {
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function hardenAuthSession() {
  if (!supabase) {
    return { ok: false as const, reason: 'not_configured' as const }
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    await supabase.auth.signOut()
    return { ok: false as const, reason: 'session_invalid' as const }
  }

  if (!session) {
    return { ok: true as const, refreshed: false as const }
  }

  const expiresAt = session.expires_at ?? 0
  const expiresSoon = expiresAt > 0 && expiresAt - Math.floor(Date.now() / 1000) < 120

  if (!expiresSoon) {
    return { ok: true as const, refreshed: false as const }
  }

  const { error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) {
    await supabase.auth.signOut()
    return { ok: false as const, reason: 'refresh_failed' as const }
  }

  return { ok: true as const, refreshed: true as const }
}

export function onAuthChange(callback: (session: Session | null) => void) {
  if (!supabase) {
    return () => undefined
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return () => {
    data.subscription.unsubscribe()
  }
}

export async function signInWithGoogle() {
  if (!supabase) {
    return { ok: false as const, reason: 'not_configured' as const }
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    return { ok: false as const, reason: 'oauth_failed' as const }
  }

  return { ok: true as const }
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    return { ok: false as const, reason: 'not_configured' as const }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { ok: false as const, reason: 'signin_failed' as const }
  }

  return { ok: true as const }
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) {
    return { ok: false as const, reason: 'not_configured' as const }
  }

  const { error } = await supabase.auth.signUp({ email, password })
  if (error) {
    return { ok: false as const, reason: 'signup_failed' as const }
  }

  return { ok: true as const }
}

export async function signOutSupabase() {
  if (!supabase) {
    return { ok: false as const, reason: 'not_configured' as const }
  }

  const { error } = await supabase.auth.signOut()
  if (error) {
    return { ok: false as const, reason: 'signout_failed' as const }
  }

  return { ok: true as const }
}

export async function savePlanToSupabase(record: PlanRecord) {
  if (!supabase) {
    return { ok: false as const, reason: 'not_configured' as const }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { ok: false as const, reason: 'no_session' as const }
  }

  const { error } = await supabase.from(PLAN_TABLE).insert({
    id: record.id,
    user_id: session.user.id,
    anonymous_id: record.anonymousId,
    created_at: record.createdAt,
    input: record.input,
    output: record.output,
  })

  if (error) {
    return { ok: false as const, reason: 'insert_failed' as const }
  }

  return { ok: true as const }
}

export async function fetchPlanHistoryFromSupabase() {
  if (!supabase) {
    return [] as PlanRecord[]
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return [] as PlanRecord[]
  }

  const { data, error } = await supabase
    .from(PLAN_TABLE)
    .select('id, anonymous_id, created_at, input, output')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error || !data) {
    return [] as PlanRecord[]
  }

  return data.map((row) => ({
    id: row.id,
    anonymousId: row.anonymous_id,
    createdAt: row.created_at,
    input: row.input,
    output: row.output,
  }))
}

export async function createChatThreadInSupabase(thread: ChatThread) {
  if (!supabase) {
    return { ok: false as const, reason: 'not_configured' as const }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { ok: false as const, reason: 'no_session' as const }
  }

  const { error } = await supabase.from(THREAD_TABLE).upsert({
    id: thread.id,
    user_id: session.user.id,
    title: thread.title,
    created_at: thread.createdAt,
    updated_at: thread.updatedAt,
  })

  if (error) {
    return { ok: false as const, reason: 'thread_upsert_failed' as const }
  }

  return { ok: true as const }
}

export async function fetchChatThreadsFromSupabase() {
  if (!supabase) {
    return [] as ChatThread[]
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return [] as ChatThread[]
  }

  const { data, error } = await supabase
    .from(THREAD_TABLE)
    .select('id, title, created_at, updated_at')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error || !data) {
    return [] as ChatThread[]
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function saveChatMessagesToSupabase(messages: ChatMessage[], anonymousId: string, threadId: string) {
  if (!supabase || messages.length === 0) {
    return { ok: false as const, reason: 'not_configured' as const }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { ok: false as const, reason: 'no_session' as const }
  }

  const payload = messages.map((message) => ({
    id: message.id,
    user_id: session.user.id,
    thread_id: threadId,
    anonymous_id: anonymousId,
    role: message.role,
    text: message.text,
    created_at: message.createdAt,
  }))

  const { error } = await supabase.from(CHAT_TABLE).upsert(payload)
  if (error) {
    return { ok: false as const, reason: 'chat_upsert_failed' as const }
  }

  return { ok: true as const }
}

export async function fetchChatMessagesFromSupabase(threadId: string) {
  if (!supabase) {
    return [] as ChatMessage[]
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return [] as ChatMessage[]
  }

  const { data, error } = await supabase
    .from(CHAT_TABLE)
    .select('id, thread_id, role, text, created_at')
    .eq('user_id', session.user.id)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error || !data) {
    return [] as ChatMessage[]
  }

  return data.map((row) => ({
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    text: row.text,
    createdAt: row.created_at,
  }))
}
