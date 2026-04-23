import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const envFile = path.join(root, '.env')

async function loadEnvFile() {
  try {
    const raw = await readFile(envFile, 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue
      }
      const index = trimmed.indexOf('=')
      const key = trimmed.slice(0, index).trim()
      const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  } catch {
    // No local env file; rely on shell env.
  }
}

await loadEnvFile()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const seedUserId = process.env.SEED_USER_ID

if (!supabaseUrl || !serviceRoleKey || !seedUserId) {
  console.error('Missing required env vars: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_USER_ID')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const threadId = randomUUID()
const planId = randomUUID()
const messageIds = [randomUUID(), randomUUID(), randomUUID()]

const now = new Date().toISOString()

const thread = {
  id: threadId,
  user_id: seedUserId,
  title: 'Welcome thread',
  created_at: now,
  updated_at: now,
}

const plan = {
  id: planId,
  user_id: seedUserId,
  anonymous_id: 'seed-anonymous-user',
  created_at: now,
  input: {
    problem: 'Improve daily productivity',
    context: 'Seed sample record',
    priority: 'medium',
    hoursPerWeek: 5,
    deadlineDays: 14,
  },
  output: {
    summary: 'Seeded example plan',
    quickWin: 'Spend 15 minutes planning today',
    steps: [],
    schedule: [],
    risks: [],
  },
}

const messages = [
  {
    id: messageIds[0],
    user_id: seedUserId,
    thread_id: threadId,
    anonymous_id: 'seed-anonymous-user',
    role: 'assistant',
    text: 'Welcome to the Daily Life Problem Solver Hub.',
    created_at: now,
  },
  {
    id: messageIds[1],
    user_id: seedUserId,
    thread_id: threadId,
    anonymous_id: 'seed-anonymous-user',
    role: 'user',
    text: 'How do I get started?',
    created_at: now,
  },
  {
    id: messageIds[2],
    user_id: seedUserId,
    thread_id: threadId,
    anonymous_id: 'seed-anonymous-user',
    role: 'assistant',
    text: 'Start with one clear outcome and a 20-minute task today.',
    created_at: now,
  },
]

const { error: threadError } = await supabase.from('chat_threads').upsert(thread)
if (threadError) {
  console.error('Failed to seed chat_threads:', threadError.message)
  process.exit(1)
}

const { error: planError } = await supabase.from('problem_plans').upsert(plan)
if (planError) {
  console.error('Failed to seed problem_plans:', planError.message)
  process.exit(1)
}

const { error: chatError } = await supabase.from('chat_messages').upsert(messages)
if (chatError) {
  console.error('Failed to seed chat_messages:', chatError.message)
  process.exit(1)
}

console.log('Seed completed successfully.')
