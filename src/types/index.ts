export interface Problem {
  id: number
  problem_id: number
  title: string
  description?: string
  algorithm?: string
  created_at: string
  avgRating: string
  voteCount: number
}

export interface Comment {
  id: number
  problem_id: number
  user_id: string
  content: string
  created_at: string
}
