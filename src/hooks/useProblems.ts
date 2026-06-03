import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Problem, SortCriteria } from '@/types'

export const PAGE_SIZE = 30

export function useProblems() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const fetchProblems = useCallback(async (
    search: string,
    sort: SortCriteria,
    page: number,
  ) => {
    setLoading(true)
    try {
      let query = supabase
        .from('problems_with_stats')
        .select('*', { count: 'exact' })

      if (search.trim()) {
        const q = search.trim()
        const numericId = Number(q)
        if (!isNaN(numericId) && q !== '') {
          query = query.or(`title.ilike.%${q}%,problem_id.eq.${numericId}`)
        } else {
          query = query.ilike('title', `%${q}%`)
        }
      }

      switch (sort) {
        case 'difficulty-high':
          query = query.order('avg_rating', { ascending: false })
          break
        case 'difficulty-low':
          query = query.order('avg_rating', { ascending: true })
          break
        case 'votes-high':
          query = query.order('vote_count', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, error, count } = await query
      if (error) throw error

      setProblems((data as Problem[]) ?? [])
      setTotalCount(count ?? 0)
    } catch (err) {
      console.error('Failed to fetch problems:', err)
      setProblems([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  return { problems, loading, totalCount, fetchProblems }
}
