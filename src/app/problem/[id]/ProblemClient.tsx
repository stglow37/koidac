'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getTierStyle, parseTierName } from '@/lib/tiers'
import type { Comment, Problem } from '@/types'

interface ProblemClientProps {
  problemId: number
}

export default function ProblemClient({ problemId }: ProblemClientProps) {
  const [problem, setProblem] = useState<Problem | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userNickname, setUserNickname] = useState('익명')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [voteLoading, setVoteLoading] = useState(false)

  const tierName = parseTierName(problem?.ai_tier)
  const tierStyle = getTierStyle(tierName)

  const algorithmTags = useMemo(() => {
    if (!problem?.ai_algorithms) return []
    return problem.ai_algorithms.split(',').map((t) => t.trim()).filter(Boolean)
  }, [problem])

  useEffect(() => {
    if (!statusMessage) return
    const id = setTimeout(() => setStatusMessage(null), 3000)
    return () => clearTimeout(id)
  }, [statusMessage])

  useEffect(() => {
    if (!errorMessage) return
    const id = setTimeout(() => setErrorMessage(null), 5000)
    return () => clearTimeout(id)
  }, [errorMessage])

  const loadProblem = useCallback(async () => {
    const [{ data: problemData, error: problemError }, { data: commentsData }] = await Promise.all([
      supabase.from('problems_with_stats').select('*').eq('problem_id', problemId).single(),
      supabase.from('comments').select('*').eq('problem_id', problemId).order('created_at', { ascending: false }),
    ])

    setProblem(problemError ? null : (problemData as Problem))
    setComments(Array.isArray(commentsData) ? commentsData : [])
  }, [problemId])

  const loadVoteStats = useCallback(async () => {
    const { data } = await supabase
      .from('problems_with_stats')
      .select('avg_rating, vote_count')
      .eq('problem_id', problemId)
      .single()

    if (data) {
      setProblem((prev) => prev ? { ...prev, avg_rating: data.avg_rating, vote_count: data.vote_count } : prev)
    }
  }, [problemId])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user ?? null
      setUserId(user?.id ?? null)
      if (user) {
        setUserNickname(user.user_metadata?.display_name || user.email?.split('@')[0] || '익명')
      }
      await loadProblem()
      setLoading(false)
    }
    init()
  }, [loadProblem])

  const handleVote = async (rating: number) => {
    if (!userId) {
      setErrorMessage('투표는 로그인 후 이용 가능합니다.')
      return
    }
    setVoteLoading(true)
    setStatusMessage(null)
    setErrorMessage(null)

    const { error } = await supabase
      .from('votes')
      .insert([{ problem_id: problemId, rating, user_id: userId }])

    if (error) {
      setErrorMessage(error.code === '23505' ? '이미 이 문제에 투표하셨습니다.' : error.message)
    } else {
      setStatusMessage(`${rating}점 투표가 등록되었습니다.`)
      await loadVoteStats()
    }
    setVoteLoading(false)
  }

  const addComment = async () => {
    const trimmed = commentText.trim()
    if (!trimmed) { setErrorMessage('댓글을 입력해주세요.'); return }
    if (!userId) { setErrorMessage('댓글 작성은 로그인이 필요합니다.'); return }

    setCommentSubmitting(true)
    setStatusMessage(null)
    setErrorMessage(null)

    const { data, error } = await supabase
      .from('comments')
      .insert([{ problem_id: problemId, user_id: userId, user_nickname: userNickname, content: trimmed }])
      .select()

    if (error) {
      setErrorMessage(error.message)
    } else {
      setCommentText('')
      setComments((prev) => [...(data ?? []), ...prev])
      setStatusMessage('댓글이 등록되었습니다.')
    }
    setCommentSubmitting(false)
  }

  if (loading) {
    return (
      <main className="p-8 min-h-screen bg-gray-50 text-black">
        <div className="max-w-4xl mx-auto text-center py-24 text-gray-500">로딩 중...</div>
      </main>
    )
  }

  if (!problem) {
    return (
      <main className="p-8 min-h-screen bg-gray-50 text-black">
        <div className="max-w-4xl mx-auto rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-900">문제를 불러올 수 없습니다.</p>
          <p className="mt-2 text-sm text-gray-500">해당 문제 번호가 없거나 아직 등록되지 않은 문제입니다.</p>
          <Link href="/" className="mt-6 inline-block text-blue-600 hover:underline">← 목록으로 돌아가기</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="p-8 min-h-screen bg-gray-50 text-black">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← 목록으로 돌아가기</Link>

        <section className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col gap-2 mb-6">
            <p className="text-sm text-gray-400">#{problem.problem_id}</p>
            <h1 className="text-2xl font-bold text-gray-900">{problem.title}</h1>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mb-8">
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: tierStyle.bg, border: `1px solid ${tierStyle.border}` }}
            >
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: tierStyle.color }}>
                AI 추정 난이도
              </div>
              <div className="text-3xl font-black" style={{ color: tierStyle.color }}>
                {problem.ai_tier ?? '?'}
              </div>
              {problem.ai_reasoning && (
                <p className="mt-2 text-xs text-gray-500">{problem.ai_reasoning}</p>
              )}
            </div>

            <div className="rounded-2xl bg-blue-50 p-5 text-center border border-blue-100">
              <div className="text-xs uppercase tracking-widest text-blue-600 mb-1">유저 평균 난이도</div>
              <div className="text-3xl font-black text-blue-900">
                {problem.avg_rating > 0 ? problem.avg_rating.toFixed(1) : '—'}
              </div>
              <div className="mt-1 text-xs text-blue-500">{problem.vote_count}명 투표</div>
            </div>
          </div>

          {algorithmTags.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">AI 추정 알고리즘</h3>
              <div className="flex flex-wrap gap-2">
                {algorithmTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-gray-50 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">난이도 투표 (1~5점)</h3>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  disabled={voteLoading}
                  onClick={() => handleVote(rating)}
                  className="rounded-2xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-yellow-50 hover:border-yellow-300 disabled:opacity-50"
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">댓글</h2>
          <p className="text-sm text-gray-500">힌트를 공유하거나 질문할 수 있습니다.</p>

          {statusMessage && (
            <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">{statusMessage}</div>
          )}
          {errorMessage && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">{errorMessage}</div>
          )}

          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <textarea
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 입력하세요."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={addComment}
              disabled={commentSubmitting}
              className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              댓글 등록
            </button>
          </div>

          <div className="space-y-3">
            {comments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                아직 등록된 댓글이 없습니다.
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-3xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="font-semibold text-gray-800">{comment.user_nickname}</span>
                    <span>{new Date(comment.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                  <p className="mt-3 text-gray-700 whitespace-pre-line">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
