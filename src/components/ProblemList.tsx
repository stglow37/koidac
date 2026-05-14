'use client'

import Link from 'next/link'
import { Problem } from '@/types'

interface ProblemListProps {
  problems: Problem[]
  onVote: (problemId: number, rating: number) => void
  loading: boolean
}

export function ProblemList({ problems, onVote, loading }: ProblemListProps) {
  return (
    <div className="space-y-4">
      {problems.map((p) => (
        <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-4 hover:ring-2 hover:ring-blue-100 transition-all">
          <Link href={`/problem/${p.problem_id}`} className="flex items-center gap-4 flex-1 min-w-0">
            <div className="bg-blue-50 px-3 py-1 rounded text-blue-700 font-bold">{p.avgRating}</div>
            <div>
              <div className="text-xs text-gray-400">#{p.problem_id}</div>
              <div className="font-bold text-gray-800">{p.title}</div>
            </div>
          </Link>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onVote(p.problem_id, num)}
                disabled={loading}
                className="w-9 h-9 border rounded-lg hover:bg-yellow-400 transition-all font-medium text-sm disabled:opacity-50"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
