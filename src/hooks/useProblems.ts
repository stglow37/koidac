import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Problem } from '@/types'

export function useProblems() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loadingProblems, setLoadingProblems] = useState(false)

  const fetchProblemsWithRatings = useCallback(async () => {
    setLoadingProblems(true)
    try {
      const { data: problemsData, error: problemsError } = await supabase
        .from('problems')
        .select('*')
        .order('created_at', { ascending: false })

      if (problemsError) throw problemsError
      if (!problemsData) {
        setProblems([])
        return
      }

      const updatedProblems = await Promise.all(
        problemsData.map(async (p: any) => {
          const { data: votes } = await supabase
            .from('votes')
            .select('rating')
            .eq('problem_id', p.problem_id)

          const avg = votes && votes.length > 0
            ? (votes.reduce((acc, v) => acc + v.rating, 0) / votes.length).toFixed(1)
            : '0.0'

          return {
            ...p,
            avgRating: avg,
            voteCount: votes?.length || 0,
          } as Problem
        })
      )

      setProblems(updatedProblems)
    } catch (error) {
      console.error('Failed to fetch problems:', error)
      setProblems([])
    } finally {
      setLoadingProblems(false)
    }
  }, [])

  return {
    problems,
    loadingProblems,
    fetchProblemsWithRatings,
    setProblems,
  }
}
