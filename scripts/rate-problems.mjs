/**
 * Batch script: scrape all KOISTUDY problems → rate with Gemini → upsert into Supabase
 *
 * Usage:
 *   node scripts/rate-problems.mjs
 *
 * Required env vars in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   GEMINI_API_KEY
 *
 * The script resumes from where it left off (skips problems that already have ai_tier).
 * Gemini free tier: 15 RPM → 4 second delay between calls.
 * Expected runtime for 4000 problems: ~4.5 hours.
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env.local manually (no dotenv dependency needed)
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    process.env[key] = val
  }
} catch {
  console.error('Could not read .env.local — make sure it exists in the project root.')
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const GEMINI_KEY   = process.env.GEMINI_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_KEY) {
  console.error('Missing env vars. Check NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GEMINI_API_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const genAI    = new GoogleGenerativeAI(GEMINI_KEY)
const model    = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

const KOISTUDY_URL = 'https://koistudy.net/prob_page?NO='
const START_ID     = 1
const END_ID       = 5000
const DELAY_MS     = 4200  // ~14 RPM, safely under free tier 15 RPM limit

const PROMPT_SYSTEM = `당신은 competitive programming 전문가입니다.
주어진 문제를 분석하여 solved.ac 기준 난이도를 평가해주세요.

## solved.ac 난이도 기준
Bronze (1~5): 단순 반복문, 기초 사칙연산, 조건문만으로 해결 가능
Silver (1~5): BFS/DFS, 기본 DP, 이분탐색, 스택/큐, 그리디 기초
Gold (1~5): 다익스트라, MST, 중급 DP, 위상정렬, 세그먼트트리 기초
Platinum (1~5): KMP, 트리 DP, 고급 자료구조, 네트워크 플로우
Diamond (1~5): 창의적 알고리즘 설계, 수학적 통찰 필요
Ruby (1~5): 최상위 난이도, 연구 수준 알고리즘

## 판단 기준
- 제약조건(N의 범위)을 반드시 확인
  - N ≤ 1,000 → O(N²) 허용 → Silver 가능
  - N ≤ 100,000 → O(N log N) 필요 → Gold 이상
- level: 1이 해당 tier에서 가장 어려움, 5가 가장 쉬움`

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function scrapeStatement(problemId) {
  try {
    const res = await fetch(`${KOISTUDY_URL}${problemId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KOIDAC-Rater/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null

    const html = await res.text()

    // Extract title
    const titleMatch = html.match(/<div class="title">\s*<h1>\s*([\s\S]*?)\s*<\/h1>/)
    const title = titleMatch ? titleMatch[1].trim() : null
    if (!title) return null

    // Extract problem JSON data
    const dataMatch = html.match(/<script id="prob-data" type="application\/json">([\s\S]*?)<\/script>/)
    if (!dataMatch) return { title, statement: null }

    const data = JSON.parse(dataMatch[1])
    const parts = [data.background, data.input, data.output].filter(Boolean)
    const statement = parts.join('\n\n').slice(0, 4000) // cap at 4000 chars

    return { title, statement }
  } catch {
    return null
  }
}

async function rateWithGemini(title, statement) {
  const content = statement
    ? `제목: ${title}\n\n${statement}`
    : `제목: ${title}\n\n(문제 내용 없음 — 제목만으로 추정)`

  const prompt = `${PROMPT_SYSTEM}

## 평가할 문제
${content}

다음 JSON 형식으로만 답하세요 (다른 텍스트 없이):
{"tier": "Gold", "level": 4, "algorithms": ["DP", "BFS"], "reasoning": "한 문장 근거"}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null

    const parsed = JSON.parse(match[0])
    const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ruby']
    if (!validTiers.includes(parsed.tier)) return null
    if (parsed.level < 1 || parsed.level > 5) return null

    return parsed
  } catch {
    return null
  }
}

async function main() {
  console.log(`Starting batch rating: problems ${START_ID}–${END_ID}`)
  console.log('Skipping problems that already have ai_tier set.\n')

  // Fetch all existing problem_ids that already have ai_tier
  const { data: existing } = await supabase
    .from('problems')
    .select('problem_id')
    .not('ai_tier', 'is', null)

  const alreadyRated = new Set((existing ?? []).map((r) => r.problem_id))
  console.log(`${alreadyRated.size} problems already rated, skipping them.\n`)

  let processed = 0
  let inserted  = 0
  let skipped   = 0
  let failed    = 0

  for (let id = START_ID; id <= END_ID; id++) {
    if (alreadyRated.has(id)) {
      skipped++
      continue
    }

    process.stdout.write(`[${id}/${END_ID}] Scraping... `)

    const scraped = await scrapeStatement(id)
    if (!scraped) {
      process.stdout.write('no data (skipping)\n')
      skipped++
      continue
    }

    process.stdout.write(`"${scraped.title.slice(0, 30)}" → rating... `)

    const rating = await rateWithGemini(scraped.title, scraped.statement)
    if (!rating) {
      process.stdout.write('Gemini failed\n')
      failed++
      await sleep(DELAY_MS)
      continue
    }

    const aiTier = `${rating.tier} ${rating.level}`
    const aiAlgorithms = Array.isArray(rating.algorithms) ? rating.algorithms.join(', ') : ''

    const { error } = await supabase.from('problems').upsert(
      {
        problem_id:    id,
        title:         scraped.title,
        statement:     scraped.statement,
        ai_tier:       aiTier,
        ai_algorithms: aiAlgorithms,
        ai_reasoning:  rating.reasoning ?? null,
      },
      { onConflict: 'problem_id' }
    )

    if (error) {
      process.stdout.write(`DB error: ${error.message}\n`)
      failed++
    } else {
      process.stdout.write(`${aiTier} ✓\n`)
      inserted++
    }

    processed++
    await sleep(DELAY_MS)

    if (processed % 50 === 0) {
      console.log(`\n--- Progress: ${processed} processed, ${inserted} upserted, ${skipped} skipped, ${failed} failed ---\n`)
    }
  }

  console.log('\n=== Done ===')
  console.log(`Total processed: ${processed}`)
  console.log(`Upserted: ${inserted}`)
  console.log(`Skipped (no data or already rated): ${skipped}`)
  console.log(`Failed: ${failed}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
