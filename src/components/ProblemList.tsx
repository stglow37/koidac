'use client'

import Link from 'next/link'
import type { Problem } from '@/types'

interface TierStyle {
  color: string
  bg: string
  border: string
}

function getTierStyle(tier: string | null): TierStyle {
  switch (tier) {
    case 'Bronze':   return { color: '#92400e', bg: '#fef3c7', border: '#fde68a' }
    case 'Silver':   return { color: '#374151', bg: '#f3f4f6', border: '#d1d5db' }
    case 'Gold':     return { color: '#b45309', bg: '#fffbeb', border: '#fde68a' }
    case 'Platinum': return { color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' }
    case 'Diamond':  return { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' }
    case 'Ruby':     return { color: '#be123c', bg: '#fff1f2', border: '#fecdd3' }
    default:         return { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' }
  }
}

function AiTierBadge({ aiTier }: { aiTier: string | null }) {
  if (!aiTier) {
    return (
      <span className="inline-block text-xs font-bold px-2 py-0.5 rounded border"
        style={{ color: '#9ca3af', background: '#f9fafb', borderColor: '#e5e7eb' }}>
        ?
      </span>
    )
  }
  const tier = aiTier.split(' ')[0]
  const style = getTierStyle(tier)
  return (
    <span
      className="inline-block text-xs font-bold px-2 py-0.5 rounded border"
      style={{ color: style.color, background: style.bg, borderColor: style.border }}
      title={`AI 추정 난이도: ${aiTier}`}
    >
      {aiTier}
    </span>
  )
}

interface ProblemListProps {
  problems: Problem[]
  onVote: (problemId: number, rating: number) => void
  loading: boolean
}

export function ProblemList({ problems, onVote, loading }: ProblemListProps) {
  return (
    <div className="space-y-3">
      {problems.map((p) => (
        <div
          key={p.id}
          className="bg-white p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-4 hover:ring-2 hover:ring-blue-100 transition-all"
        >
          <Link href={`/problem/${p.problem_id}`} className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex flex-col items-center min-w-[56px]">
              <AiTierBadge aiTier={p.ai_tier} />
              <div className="mt-1 text-xs text-gray-400">AI 추정</div>
            </div>
            <div className="flex flex-col items-center min-w-[44px]">
              <div className="bg-blue-50 px-2 py-0.5 rounded text-blue-700 font-bold text-sm">
                {p.avg_rating > 0 ? p.avg_rating.toFixed(1) : '—'}
              </div>
              <div className="mt-1 text-xs text-gray-400">유저({p.vote_count})</div>
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-400">#{p.problem_id}</div>
              <div className="font-bold text-gray-800 truncate">{p.title}</div>
            </div>
          </Link>
          <div className="flex gap-1 shrink-0">
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
