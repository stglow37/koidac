'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Comment, Problem } from '@/types'

const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase())
  : []

type ConfirmTarget = { type: 'problem'; id: number } | { type: 'comment'; id: number }

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function adminFetch(path: string, body: object): Promise<{ error?: string }> {
  const token = await getToken()
  if (!token) return { error: '세션이 만료되었습니다. 다시 로그인해주세요.' }

  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json()
    return { error: data.error || '요청 실패' }
  }
  return {}
}

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [problems, setProblems] = useState<Problem[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)

  const loadAdminData = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    setStatusMessage(null)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      setErrorMessage(sessionError.message)
      setLoading(false)
      return
    }

    const email = sessionData.session?.user?.email ?? null
    setUserEmail(email)
    const admin = !!email && ADMIN_EMAILS.includes(email.toLowerCase())
    setIsAdmin(admin)

    if (!admin) {
      setLoading(false)
      return
    }

    const [{ data: problemData, error: problemError }, { data: commentsData, error: commentsError }] =
      await Promise.all([
        supabase.from('problems_with_stats').select('*').order('problem_id', { ascending: true }),
        supabase.from('comments').select('*').order('created_at', { ascending: false }),
      ])

    if (problemError) {
      setErrorMessage(problemError.message)
    } else {
      setProblems((problemData as Problem[]) ?? [])
    }

    if (commentsError) {
      setErrorMessage((prev) => prev ?? commentsError.message)
    } else {
      setComments(commentsData ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadAdminData()
  }, [loadAdminData])

  const handleDeleteProblem = async (problem: Problem) => {
    if (confirmTarget?.type === 'problem' && confirmTarget.id === problem.id) {
      setConfirmTarget(null)
      setErrorMessage(null)
      setStatusMessage(null)

      const { error } = await adminFetch('/api/admin/delete-problem', {
        id: problem.id,
        problemId: problem.problem_id,
      })
      if (error) { setErrorMessage(error); return }

      setStatusMessage('문제가 삭제되었습니다.')
      await loadAdminData()
    } else {
      setConfirmTarget({ type: 'problem', id: problem.id })
    }
  }

  const handleDeleteComment = async (id: number) => {
    if (confirmTarget?.type === 'comment' && confirmTarget.id === id) {
      setConfirmTarget(null)
      setErrorMessage(null)
      setStatusMessage(null)

      const { error } = await adminFetch('/api/admin/delete-comment', { id })
      if (error) { setErrorMessage(error); return }

      setStatusMessage('댓글이 삭제되었습니다.')
      setComments((prev) => prev.filter((c) => c.id !== id))
    } else {
      setConfirmTarget({ type: 'comment', id })
    }
  }

  if (loading) {
    return (
      <main className="p-8 min-h-screen bg-gray-50 text-black">
        <div className="max-w-4xl mx-auto text-center py-24 text-gray-500">관리자 페이지를 준비 중입니다...</div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="p-8 min-h-screen bg-gray-50 text-black">
        <div className="max-w-4xl mx-auto rounded-3xl border border-gray-200 bg-white p-10 shadow-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900">권한이 필요합니다</h1>
          <p className="mt-3 text-gray-600">관리자 계정으로 로그인해야 접근할 수 있습니다.</p>
          <Link href="/" className="mt-6 inline-block text-blue-600 hover:underline">← 홈으로 돌아가기</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="p-8 min-h-screen bg-gray-50 text-black">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
            <p className="mt-2 text-sm text-gray-600">{userEmail}로 로그인되어 있습니다.</p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">일반 페이지 보기</Link>
        </div>

        {statusMessage && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">{statusMessage}</div>
        )}
        {errorMessage && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">{errorMessage}</div>
        )}

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">문제 관리 ({problems.length}개)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">번호</th>
                  <th className="px-4 py-3 font-medium text-gray-700">제목</th>
                  <th className="px-4 py-3 font-medium text-gray-700">AI 난이도</th>
                  <th className="px-4 py-3 font-medium text-gray-700">유저 평점</th>
                  <th className="px-4 py-3 font-medium text-gray-700">투표수</th>
                  <th className="px-4 py-3 font-medium text-gray-700">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {problems.map((problem) => {
                  const isPending = confirmTarget?.type === 'problem' && confirmTarget.id === problem.id
                  return (
                    <tr key={problem.id}>
                      <td className="px-4 py-3 text-gray-700">#{problem.problem_id}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{problem.title}</td>
                      <td className="px-4 py-3 text-gray-700">{problem.ai_tier ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {problem.avg_rating > 0 ? problem.avg_rating.toFixed(1) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{problem.vote_count}</td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteProblem(problem)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold text-white ${isPending ? 'bg-red-700' : 'bg-red-500 hover:bg-red-600'}`}
                        >
                          {isPending ? '확인?' : '삭제'}
                        </button>
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => setConfirmTarget(null)}
                            className="rounded-xl bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
                          >
                            취소
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">댓글 관리 ({comments.length}개)</h2>
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                댓글이 없습니다.
              </div>
            ) : (
              comments.map((comment) => {
                const isPending = confirmTarget?.type === 'comment' && confirmTarget.id === comment.id
                return (
                  <div key={comment.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500">
                      <div>
                        문제 #{comment.problem_id} ·{' '}
                        <span className="font-medium text-gray-700">{comment.user_nickname}</span>
                      </div>
                      <span>{new Date(comment.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <p className="mt-2 text-gray-700 whitespace-pre-line text-sm">{comment.content}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold text-white ${isPending ? 'bg-red-700' : 'bg-red-500 hover:bg-red-600'}`}
                      >
                        {isPending ? '확인?' : '삭제'}
                      </button>
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => setConfirmTarget(null)}
                          className="rounded-xl bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
