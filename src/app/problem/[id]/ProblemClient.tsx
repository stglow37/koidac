'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
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
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [voteLoading, setVoteLoading] = useState(false)

  const algorithmTags = useMemo(() => {
    if (!problem?.algorithm) return []
    return problem.algorithm.split(',').map((tag) => tag.trim()).filter(Boolean)
  }, [problem])

  const loadPage = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)

    const sessionResult = await supabase.auth.getSession()
    setUserId(sessionResult.data.session?.user?.id ?? null)

    const [{ data: problemData, error: problemError }, { data: commentsData, error: commentsError }] = await Promise.all([
      supabase.from('problems').select('*').eq('problem_id', problemId).single(),
      supabase
        .from('comments')
        .select('*')
        .eq('problem_id', problemId)
        .order('created_at', { ascending: false }),
    ])

    if (problemError) {
      setErrorMessage(problemError.message)
      setProblem(null)
    } else {
      setProblem(problemData)
    }

    // Some supabase clients may return an empty object for errors.
    // Treat falsy or empty error objects as no-error, and ensure commentsData is an array.
    if (commentsError && Object.keys(commentsError).length > 0) {
      console.error('Failed to load comments', commentsError)
      setComments([])
    } else {
      setComments(Array.isArray(commentsData) ? commentsData : [])
    }

    setLoading(false)
  }, [problemId])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  const addComment = async () => {
    const trimmed = commentText.trim()
    if (!trimmed) {
      setErrorMessage('댓글을 입력해주세요.')
      return
    }
    if (!userId) {
      setErrorMessage('댓글 작성은 로그인이 필요합니다.')
      return
    }

    setCommentSubmitting(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const { data, error } = await supabase.from('comments').insert([
        {
          problem_id: problemId,
          user_id: userId,
          content: trimmed,
        },
      ])

      if (error) {
        throw error
      }

      setCommentText('')
      setComments((prev) => [...(data ?? []), ...prev])
      setStatusMessage('댓글이 등록되었습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '댓글 등록 중 오류가 발생했습니다.')
    } finally {
      setCommentSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="p-8 min-h-screen bg-gray-50 text-black">
        <div className="max-w-4xl mx-auto text-center py-24 text-gray-500">로딩 중입니다...</div>
      </main>
    )
  }

  if (!problem) {
    return (
      <main className="p-8 min-h-screen bg-gray-50 text-black">
        <div className="max-w-4xl mx-auto rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-900">문제를 불러올 수 없습니다.</p>
          <p className="mt-3 text-sm text-gray-600">해당 문제 번호가 없거나 서버 오류가 발생했습니다.</p>
          <div className="mt-6">
            <Link href="/" className="text-blue-600 hover:underline">
              ← 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="p-8 min-h-screen bg-gray-50 text-black">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← 목록으로 돌아가기
        </Link>

        <section className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">문제 {problemId}</h1>
              <p className="mt-2 text-sm text-gray-500">문제 상세 페이지에서 정보와 토론을 관리합니다.</p>
            </div>
            <div className="rounded-3xl bg-blue-50 px-5 py-4 text-center">
              <div className="text-xs uppercase tracking-[0.2em] text-blue-700">평균 난이도</div>
              <div className="mt-2 text-4xl font-bold text-blue-900">{problem?.avgRating ?? '—'}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">문제 제목</h2>
                <p className="mt-2 text-lg font-bold text-gray-800">{problem?.title ?? '정보 없음'}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">설명</h3>
                <p className="mt-3 text-gray-700 whitespace-pre-line">{problem?.description ?? '설명 정보가 없습니다.'}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">알고리즘 태그</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {algorithmTags.length > 0 ? (
                    algorithmTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">태그가 등록되어 있지 않습니다.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-gray-50 p-6">
              <h3 className="text-lg font-semibold text-gray-900">투표</h3>
              <p className="mt-2 text-sm text-gray-600">1~5점으로 난이도를 평가하세요.</p>
              <div className="mt-5 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    disabled={voteLoading}
                    className="rounded-2xl border border-gray-300 bg-white px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-blue-50 disabled:opacity-50"
                    onClick={async () => {
                      if (!userId) {
                        setErrorMessage('투표는 로그인 후 이용 가능합니다.')
                        return
                      }

                      setVoteLoading(true)
                      setStatusMessage(null)
                      setErrorMessage(null)

                      try {
                        const { error } = await supabase.from('votes').insert([
                          { problem_id: problemId, rating, user_id: userId },
                        ])

                        if (error) {
                          throw error
                        }

                        setStatusMessage(`${rating}점 투표가 등록되었습니다.`)
                        await loadPage()
                      } catch (error) {
                        setErrorMessage(error instanceof Error ? error.message : '투표 중 오류가 발생했습니다.')
                      } finally {
                        setVoteLoading(false)
                      }
                    }}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">댓글</h2>
            <p className="mt-2 text-sm text-gray-500">다른 사람들과 힌트를 공유하거나 질문할 수 있습니다.</p>
          </div>

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
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="댓글을 입력하세요."
              className="w-full rounded-3xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={addComment}
              disabled={commentSubmitting}
              className="mt-4 rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              댓글 등록
            </button>
          </div>

          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                아직 등록된 댓글이 없습니다.
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-3xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-4 text-sm text-gray-500">
                    <span>작성자: {comment.user_id}</span>
                    <span>{new Date(comment.created_at).toLocaleString()}</span>
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
