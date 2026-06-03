export interface Problem {
  id: number
  problem_id: number
  title: string
  statement: string | null
  ai_tier: string | null
  ai_algorithms: string | null
  ai_reasoning: string | null
  created_at: string
  // Computed by problems_with_stats view
  avg_rating: number
  vote_count: number
}

export interface Comment {
  id: number
  problem_id: number
  user_id: string
  user_nickname: string
  content: string
  created_at: string
}

export type SortCriteria = 'latest' | 'difficulty-high' | 'difficulty-low' | 'votes-high'
