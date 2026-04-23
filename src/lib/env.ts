export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  aiProxyEnabled: (import.meta.env.VITE_AI_PROXY_ENABLED as string | undefined) ?? 'true',
}

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey)
export const hasGemini = env.aiProxyEnabled !== 'false'
