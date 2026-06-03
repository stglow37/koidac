'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AuthForm from '@/components/AuthForm'
import { ProblemList } from '@/components/ProblemList'
import { useProblems, PAGE_SIZE } from '@/hooks/useProblems'
import type { SortCriteria } from '@/types'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortCriteria>('latest')
  const [page, setPage] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { problems, loading, totalCount, fetchProblems } = useProblems()

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase())
    : []
  const isAdmin = user?.email ? adminEmails.includes(user.email.toLowerCase()) : false

  const load = useCallback(() => {
    fetchProblems(search, sort, page)
  }, [fetchProblems, search, sort, page])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleVote = async (problemId: number, rating: number) => {
    if (!user) {
      setErrorMessage('투표를 하려면 먼저 로그인해야 합니다.')
      return
    }
    setActionLoading(true)
    setStatusMessage(null)
    setErrorMessage(null)

    const { error } = await supabase
      .from('votes')
      .insert([{ problem_id: problemId, rating, user_id: user.id }])

    if (error) {
      setErrorMessage(error.code === '23505' ? '이미 이 문제에 투표하셨습니다.' : error.message)
    } else {
      setStatusMessage(`${rating}점이 등록되었습니다!`)
      load()
    }
    setActionLoading(false)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const handleSortChange = (value: SortCriteria) => {
    setSort(value)
    setPage(0)
  }

  return (
    <main className="p-8 max-w-4xl mx-auto font-sans bg-gray-50 min-h-screen text-black">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-blue-900">KOI-DAC</h1>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {user.user_metadata?.display_name || user.email}
            </span>
            {isAdmin && (
              <Link href="/admin" className="text-sm text-blue-600 hover:underline">
                관리자
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-red-500 hover:underline"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {!user ? (
        <AuthForm />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="문제 번호 또는 제목 검색"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 p-3 border rounded-xl bg-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="sort" className="text-sm text-gray-600">정렬:</label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => handleSortChange(e.target.value as SortCriteria)}
                className="p-3 border rounded-xl bg-white"
              >
                <option value="latest">최신순</option>
                <option value="difficulty-high">난이도 높은순</option>
                <option value="difficulty-low">난이도 낮은순</option>
                <option value="votes-high">투표 많은순</option>
              </select>
            </div>
          </div>

          {statusMessage && (
            <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              {statusMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="text-center text-gray-500 py-16">Loading...</div>
          ) : problems.length === 0 ? (
            <div className="text-center rounded-2xl bg-white border border-gray-200 p-8 text-gray-600">
              해당하는 문제가 없습니다.
            </div>
          ) : (
            <>
              <div className="mb-3 text-sm text-gray-500">
                총 {totalCount.toLocaleString()}개 문제
              </div>
              <ProblemList problems={problems} onVote={handleVote} loading={actionLoading} />
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 rounded-xl border bg-white text-sm disabled:opacity-40"
                  >
                    이전
                  </button>
                  <span className="text-sm text-gray-600">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-4 py-2 rounded-xl border bg-white text-sm disabled:opacity-40"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}
