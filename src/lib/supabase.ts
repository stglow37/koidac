import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

console.log("=== Supabase 설정 로드 ===")
console.log("URL 존재 여부:", !!supabaseUrl)
console.log("ANON_KEY 앞 5글자:", supabaseAnonKey.substring(0, 5))

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

if (process.env.NODE_ENV === 'development') {
  try {
    const masked = supabaseAnonKey ? `***${supabaseAnonKey.slice(-6)}` : 'missing'
    // eslint-disable-next-line no-console
    console.debug('[supabase] URL:', supabaseUrl, 'ANON_KEY:', masked)
  } catch (e) {
    // ignore
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)