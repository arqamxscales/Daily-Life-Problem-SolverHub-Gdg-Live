import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Bot, CalendarClock, Clock3, MessageSquare, Rocket, Sparkles, Target, Wand2 } from 'lucide-react'
import clsx from 'clsx'
import { hasGemini, hasSupabase } from './lib/env'
import { generateAssistantReply, upgradePlanWithAgent } from './lib/assistant'
import { generateGeminiPlan } from './lib/gemini'
import { buildFallbackPlan } from './lib/planner'
import { savePlanToSupabase } from './lib/supabase'
import { getAnonymousId, loadLocalHistory, savePlanToLocal } from './lib/storage'
import type { AgentMode, ChatMessage, PlanRecord, Priority, ProblemInput } from './types'

const initialInput: ProblemInput = {
  problem: '',
  context: '',
  priority: 'medium',
  hoursPerWeek: 6,
  deadlineDays: 14,
}

const agentOptions: { label: string; value: AgentMode; hint: string }[] = [
  { label: 'Planner Agent', value: 'planner', hint: 'Best for clear strategy and execution structure.' },
  { label: 'Coach Agent', value: 'coach', hint: 'Best for motivation, consistency, and accountability.' },
  { label: 'Critic Agent', value: 'critic', hint: 'Best for risk analysis and weak-point detection.' },
  { label: 'Scheduler Agent', value: 'scheduler', hint: 'Best for practical weekly time blocking.' },
]

function App() {
  const [anonymousId] = useState(() => getAnonymousId())
  const [input, setInput] = useState<ProblemInput>(initialInput)
  const [loading, setLoading] = useState(false)
  const [agentLoading, setAgentLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [history, setHistory] = useState<PlanRecord[]>(() => loadLocalHistory())
  const [activePlan, setActivePlan] = useState<PlanRecord | null>(() => loadLocalHistory()[0] ?? null)
  const [agentMode, setAgentMode] = useState<AgentMode>('planner')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: 'Hi, I am your AI agent. Ask me follow-up questions, blockers, or how to adjust your plan.',
      createdAt: new Date().toISOString(),
    },
  ])
  const [status, setStatus] = useState('Ready. Describe your problem to get a practical action plan.')

  const stackLabel = `${hasGemini ? 'Gemini AI' : 'Smart fallback engine'} · ${hasSupabase ? 'Supabase sync on' : 'Local history only'}`

  function updateField<K extends keyof ProblemInput>(key: K, value: ProblemInput[K]) {
    setInput((previous) => ({ ...previous, [key]: value }))
  }

  async function persistRecord(record: PlanRecord) {
    const localHistory = savePlanToLocal(record)
    setHistory(localHistory)
    setActivePlan(record)

    const dbResult = await savePlanToSupabase(record)
    if (dbResult.ok) {
      setStatus('Saved locally and synced to Supabase.')
    } else {
      setStatus('Saved locally.')
    }
  }

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!input.problem.trim()) {
      setStatus('Please write the problem statement first.')
      return
    }

    setLoading(true)
    setStatus('Generating your plan...')

    try {
      const aiPlan = await generateGeminiPlan(input)
      const output = aiPlan ?? buildFallbackPlan(input)

      const record: PlanRecord = {
        id: crypto.randomUUID(),
        anonymousId,
        createdAt: new Date().toISOString(),
        input,
        output,
      }

      await persistRecord(record)
      setStatus('Plan generated successfully.')
    } catch {
      const fallback = buildFallbackPlan(input)
      const record: PlanRecord = {
        id: crypto.randomUUID(),
        anonymousId,
        createdAt: new Date().toISOString(),
        input,
        output: fallback,
      }
      await persistRecord(record)
      setStatus('AI was unavailable. Generated a local smart plan instead.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgradePlan() {
    if (!activePlan) {
      setStatus('Generate a plan first, then run agent upgrade.')
      return
    }

    setAgentLoading(true)
    setStatus(`Running ${agentOptions.find((option) => option.value === agentMode)?.label}...`)

    try {
      const upgradedOutput = await upgradePlanWithAgent({
        mode: agentMode,
        input: activePlan.input,
        plan: activePlan.output,
      })

      const upgraded: PlanRecord = {
        id: crypto.randomUUID(),
        anonymousId,
        createdAt: new Date().toISOString(),
        input: activePlan.input,
        output: upgradedOutput,
      }

      await persistRecord(upgraded)
      setStatus('Agent upgraded your plan.')
    } catch {
      setStatus('Agent upgrade failed. Try again.')
    } finally {
      setAgentLoading(false)
    }
  }

  async function handleChatSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!chatInput.trim()) {
      return
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: chatInput.trim(),
      createdAt: new Date().toISOString(),
    }

    setChatInput('')
    setChatLoading(true)
    setChatMessages((previous) => [...previous, userMessage])

    try {
      const reply = await generateAssistantReply({
        mode: agentMode,
        question: userMessage.text,
        input: activePlan?.input ?? null,
        plan: activePlan?.output ?? null,
        history: [...chatMessages, userMessage],
      })

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: reply,
        createdAt: new Date().toISOString(),
      }

      setChatMessages((previous) => [...previous, assistantMessage])
    } catch {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'I could not process that query. Please try again.',
        createdAt: new Date().toISOString(),
      }

      setChatMessages((previous) => [...previous, assistantMessage])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/10 to-cyan-400/20 p-6 shadow-2xl shadow-indigo-700/20"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-100">
                <Sparkles size={14} /> Daily Life Problem Solver Hub
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Turn messy life problems into clear weekly action plans</h1>
              <p className="mt-2 text-sm text-slate-200/90">{stackLabel}</p>
            </div>
            <span className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">Anonymous mode</span>
          </div>
        </motion.header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onSubmit={handleGenerate}
            className="space-y-5 rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur"
          >
            <h2 className="text-lg font-semibold">Describe your problem</h2>

            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Problem statement</span>
              <textarea
                required
                value={input.problem}
                onChange={(event) => updateField('problem', event.target.value)}
                placeholder="Example: I keep procrastinating and miss important deadlines."
                className="h-28 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-indigo-400/40 transition focus:ring"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Context (optional)</span>
              <textarea
                value={input.context}
                onChange={(event) => updateField('context', event.target.value)}
                placeholder="Constraints, routines, blockers, habits..."
                className="h-24 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-indigo-400/40 transition focus:ring"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Priority</span>
                <select
                  value={input.priority}
                  onChange={(event) => updateField('priority', event.target.value as Priority)}
                  className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-indigo-400/40 transition focus:ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Hours / week</span>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={input.hoursPerWeek}
                  onChange={(event) => updateField('hoursPerWeek', Number(event.target.value))}
                  className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-indigo-400/40 transition focus:ring"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Deadline (days)</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={input.deadlineDays}
                  onChange={(event) => updateField('deadlineDays', Number(event.target.value))}
                  className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-indigo-400/40 transition focus:ring"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition',
                loading
                  ? 'cursor-not-allowed bg-indigo-300/30 text-indigo-100'
                  : 'bg-indigo-500 text-white hover:bg-indigo-400',
              )}
            >
              {loading ? 'Generating...' : 'Generate Action Plan'}
            </button>

            <p className="text-sm text-slate-300">{status}</p>
          </motion.form>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur"
          >
            {!activePlan ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center text-slate-300">
                <Target className="text-indigo-300" />
                <p>No plan yet. Submit a real problem to get your first roadmap.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold">Generated strategy</h2>
                  <p className="mt-2 text-sm text-slate-200">{activePlan.output.summary}</p>
                  <p className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100">
                    Quick win: {activePlan.output.quickWin}
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <CalendarClock size={16} /> Action steps
                  </h3>
                  <ul className="space-y-2">
                    {activePlan.output.steps.map((step) => (
                      <li key={step.title} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                        <p className="font-medium">{step.title}</p>
                        <p className="mt-1 text-sm text-slate-300">{step.detail}</p>
                        <p className="mt-2 text-xs text-slate-400">{step.effortHours}h effort · due in {step.dueInDays} days</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-200">7-day schedule</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {activePlan.output.schedule.map((slot) => (
                      <div key={slot.day} className="rounded-lg border border-white/10 bg-slate-950/60 p-2">
                        <p className="text-xs font-semibold text-indigo-200">{slot.day}</p>
                        <p className="mt-1 text-xs text-slate-300">{slot.focus}</p>
                        <p className="mt-1 text-xs text-slate-400">{slot.durationMinutes} min</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <AlertTriangle size={16} /> Risks to watch
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {activePlan.output.risks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </motion.section>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                  <Wand2 size={18} /> Agent Studio
                </h2>
                <p className="mt-1 text-sm text-slate-300">Switch AI modes and improve your current plan end-to-end.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {agentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAgentMode(option.value)}
                  className={clsx(
                    'rounded-xl border p-3 text-left transition',
                    agentMode === option.value
                      ? 'border-indigo-300/60 bg-indigo-300/10'
                      : 'border-white/10 bg-slate-950/60 hover:border-white/25',
                  )}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="mt-1 text-xs text-slate-300">{option.hint}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleUpgradePlan}
                disabled={agentLoading}
                className={clsx(
                  'rounded-xl px-3 py-2 text-sm font-semibold transition',
                  agentLoading
                    ? 'cursor-not-allowed bg-indigo-300/30 text-indigo-100'
                    : 'bg-indigo-500 text-white hover:bg-indigo-400',
                )}
              >
                {agentLoading ? 'Running...' : 'Upgrade Plan'}
              </button>
              <button
                type="button"
                onClick={() => setChatInput('What should I do in the next 24 hours?')}
                className="rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm transition hover:border-white/30"
              >
                24h Focus
              </button>
              <button
                type="button"
                onClick={() => setChatInput('I am blocked today. Give me a rescue protocol.')}
                className="rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm transition hover:border-white/30"
              >
                Blocker Rescue
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">
              <p className="inline-flex items-center gap-2 font-semibold">
                <Rocket size={16} /> Latest agent flow
              </p>
              <p className="mt-1 text-cyan-50/90">Problem intake → strategy generation → agent upgrade → chatbot follow-up → local/supabase persistence.</p>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                <Bot size={18} /> AI Chatbot
              </h2>
              <span className="inline-flex items-center gap-1 text-xs text-slate-300">
                <Clock3 size={14} /> {agentOptions.find((option) => option.value === agentMode)?.label}
              </span>
            </div>

            <div className="h-72 space-y-2 overflow-auto rounded-xl border border-white/10 bg-slate-950/60 p-3">
              {chatMessages.map((message) => (
                <div key={message.id} className={clsx('max-w-[92%] rounded-xl p-2 text-sm', message.role === 'user' ? 'ml-auto bg-indigo-500/20 text-indigo-50' : 'bg-slate-800 text-slate-100')}>
                  <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-slate-300">{message.role === 'user' ? 'You' : 'Agent'}</p>
                  <p>{message.text}</p>
                </div>
              ))}
              {chatLoading && (
                <div className="max-w-[92%] rounded-xl bg-slate-800 p-2 text-sm text-slate-100">
                  <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-slate-300">Agent</p>
                  <p>Thinking...</p>
                </div>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="mt-3 flex gap-2">
              <label className="sr-only" htmlFor="chat-query">Chat query</label>
              <input
                id="chat-query"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Ask about your plan, blockers, habits, or next actions..."
                className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-indigo-400/40 transition focus:ring"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                  chatLoading
                    ? 'cursor-not-allowed bg-indigo-300/30 text-indigo-100'
                    : 'bg-indigo-500 text-white hover:bg-indigo-400',
                )}
              >
                <MessageSquare size={15} /> Send
              </button>
            </form>
          </motion.section>
        </section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent problems</h2>
            <span className="text-xs text-slate-400">Saved: {history.length}</span>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-slate-300">No saved history yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {history.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setActivePlan(record)}
                  className={clsx(
                    'rounded-xl border p-3 text-left transition',
                    activePlan?.id === record.id
                      ? 'border-indigo-300/60 bg-indigo-300/10'
                      : 'border-white/10 bg-slate-950/60 hover:border-white/25',
                  )}
                >
                  <p className="line-clamp-2 text-sm font-medium">{record.input.problem}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.08em] text-slate-400">{new Date(record.createdAt).toLocaleString()}</p>
                </button>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </main>
  )
}

export default App
