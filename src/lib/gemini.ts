import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY || ''

const PROMPT_SYSTEM = `당신은 competitive programming 전문가입니다.
주어진 문제를 분석하여 solved.ac 기준 난이도를 평가해주세요.

## solved.ac 난이도 기준

Bronze (1~5): 단순 반복문, 기초 사칙연산, 조건문만으로 해결 가능한 문제
  - 특징: 알고리즘 지식 불필요, 구현만으로 해결
  - 예시 유형: 입출력 연습, 간단한 수 계산, 패턴 출력

Silver (1~5): 기본 알고리즘 1개 적용으로 해결 가능한 문제
  - 특징: BFS/DFS, 기본 DP, 이분탐색, 스택/큐, 그리디 기초
  - 예시 유형: 미로탐색, 계단오르기(DP), 수 찾기(이분탐색)

Gold (1~5): 중급 알고리즘 또는 알고리즘 조합이 필요한 문제
  - 특징: 다익스트라, MST, 중급 DP, 위상정렬, 세그먼트트리 기초
  - 예시 유형: 최단경로, LCS, 플로이드-워셜

Platinum (1~5): 고급 알고리즘 또는 복잡한 구현이 필요한 문제
  - 특징: KMP, 트리 DP, 고급 자료구조, 네트워크 플로우
  - 예시 유형: 문자열 알고리즘 조합, Heavy-Light Decomposition

Diamond (1~5): 매우 고급, 창의적 알고리즘 설계 또는 수학적 통찰 필요
Ruby (1~5): 최상위 난이도, 연구 수준 알고리즘

## 판단 기준 (중요)
- 문제의 제약조건(N의 범위)을 반드시 확인할 것
  - N ≤ 1,000 → O(N²) 허용 → Silver 가능
  - N ≤ 100,000 → O(N log N) 필요 → Gold 이상 가능
  - N ≤ 1,000,000 → 선형 또는 로그 알고리즘만 허용
- 요구하는 알고리즘의 난이도를 종합적으로 판단할 것
- level 숫자: 1이 해당 tier에서 가장 어려움, 5가 가장 쉬움`

export interface GeminiRating {
  tier: string
  level: number
  algorithms: string[]
  reasoning: string
}

export async function rateProblem(statement: string): Promise<GeminiRating | null> {
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set')
    return null
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `${PROMPT_SYSTEM}

## 평가할 문제
${statement}

다음 JSON 형식으로만 답하세요 (다른 텍스트 없이):
{"tier": "Gold", "level": 4, "algorithms": ["DP", "BFS"], "reasoning": "한 문장 근거"}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as GeminiRating

    const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ruby']
    if (!validTiers.includes(parsed.tier)) return null
    if (parsed.level < 1 || parsed.level > 5) return null

    return parsed
  } catch (err) {
    console.error('Gemini rating failed:', err)
    return null
  }
}

export function formatTier(tier: string, level: number): string {
  return `${tier} ${level}`
}
