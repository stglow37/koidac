'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Comment, Problem } from '@/types'

const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map((email) => email.trim().toLowerCase())
  : []

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [problems, setProblems] = useState<Problem[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [newProblemId, setNewProblemId] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newAlgorithm, setNewAlgorithm] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

    const email = sessionData.data.session?.user?.email ?? null
    setUserEmail(email)
    const admin = !!email && ADMIN_EMAILS.includes(email.toLowerCase())
    setIsAdmin(admin)

    if (!admin) {
      setLoading(false)
      return
    }

    const [{ data: problemData, error: problemError }, { data: commentsData, error: commentsError }] = await Promise.all([
      supabase.from('problems').select('*').order('created_at', { ascending: false }),
      supabase.from('comments').select('*').order('created_at', { ascending: false }),
    ])

    if (problemError) {
      setErrorMessage(problemError.message)
      setProblems([])
    } else {
      setProblems(problemData ?? [])
    }

    if (commentsError) {
      console.error('Failed to load comments', commentsError)
      setComments([])
    } else {
      setComments(commentsData ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadAdminData()
  }, [loadAdminData])

  const handleCreateProblem = async () => {
    if (!newProblemId || !newTitle) {
      setErrorMessage('문제 번호와 제목을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const { error } = await supabase.from('problems').insert([
        {
          problem_id: Number(newProblemId),
          title: newTitle,
          description: newDescription,
          algorithm: newAlgorithm,
        },
      ])

      if (error) throw error

      setStatusMessage('문제가 추가되었습니다.')
      setNewProblemId('')
      setNewTitle('')
      setNewDescription('')
      setNewAlgorithm('')
      await loadAdminData()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '문제 추가 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProblem = async (id: number) => {
    if (!confirm('이 문제를 삭제하시겠습니까?')) {
      return
    }
    setErrorMessage(null)
    setStatusMessage(null)

    const { error } = await supabase.from('problems').delete().eq('id', id)
    if (error) {
      setErrorMessage(error.message)
      return
    }

    setStatusMessage('문제가 삭제되었습니다.')
    await loadAdminData()
  }

  const handleDeleteComment = async (id: number) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) {
      return
    }
    setErrorMessage(null)
    setStatusMessage(null)

    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) {
      setErrorMessage(error.message)
      return
    }

    setStatusMessage('댓글이 삭제되었습니다.')
    setComments((prev) => prev.filter((comment) => comment.id !== id))
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
          <p className="mt-3 text-gray-600">관리자 계정({userEmail ?? '로그인 필요'})으로 로그인해야 접근할 수 있습니다.</p>
          <Link href="/" className="mt-6 inline-block text-blue-600 hover:underline">
            ← 홈으로 돌아가기
          </Link>
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
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            일반 페이지 보기
          </Link>
        </div>

        {(statusMessage || errorMessage) && (
          <div className="space-y-3">
            {statusMessage && <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">{statusMessage}</div>}
            {errorMessage && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">{errorMessage}</div>}
          </div>
        )}

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">문제 추가</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              placeholder="문제 번호"
              value={newProblemId}
              onChange={(event) => setNewProblemId(event.target.value)}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
            />
            <input
              type="text"
              placeholder="문제 제목"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
            />
            <input
              type="text"
              placeholder="알고리즘 태그 (쉼표로 구분)"
              value={newAlgorithm}
              onChange={(event) => setNewAlgorithm(event.target.value)}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-3 md:col-span-2"
            />
            <textarea
              rows={4}
              placeholder="문제 설명"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-3 md:col-span-2"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateProblem}
            disabled={submitting}
            className="mt-4 inline-flex items-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            문제 추가
          </button>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">문제 관리</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">ID</th>
                  <th className="px-4 py-3 font-medium text-gray-700">번호</th>
                  <th className="px-4 py-3 font-medium text-gray-700">제목</th>
                  <th className="px-4 py-3 font-medium text-gray-700">태그</th>
                  <th className="px-4 py-3 font-medium text-gray-700">생성일</th>
                  <th className="px-4 py-3 font-medium text-gray-700">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {problems.map((problem) => (
                  <tr key={problem.id}>
                    <td className="px-4 py-3 text-gray-700">{problem.id}</td>
                    <td className="px-4 py-3 text-gray-700">{problem.problem_id}</td>
                    <td className="px-4 py-3 text-gray-700">{problem.title}</td>
                    <td className="px-4 py-3 text-gray-700">{problem.algorithm ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{new Date(problem.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteProblem(problem.id)}
                        className="rounded-2xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">댓글 관리</h2>
          <div className="mt-4 space-y-4">
            {comments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">댓글이 없습니다.</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-gray-600">
                      문제 #{comment.problem_id} · 작성자 {comment.user_id}
                    </div>
                    <div className="text-sm text-gray-500">{new Date(comment.created_at).toLocaleString()}</div>
                  </div>
                  <p className="mt-3 text-gray-700 whitespace-pre-line">{comment.content}</p>
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="mt-4 rounded-2xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                  >
                    삭제
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
