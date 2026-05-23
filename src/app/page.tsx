'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuthForm from '@/components/AuthForm'
import { ProblemList } from '@/components/ProblemList'
import { useProblems } from '@/hooks/useProblems'

type SortCriteria = 'latest' | 'difficulty-high' | 'difficulty-low' | 'votes-high'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [problemId, setProblemId] = useState('')
  const [title, setTitle] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('latest')
  
  // 💡 메인 페이지의 순수 UI 알림용으로만 사용할 메시지 상태 (로딩은 전역 useProblems가 처리)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { problems, loadingProblems, fetchProblemsWithRatings } = useProblems()

  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map((email) => email.trim().toLowerCase())
    : []
  const isAdmin = user?.email ? adminEmails.includes(user.email.toLowerCase()) : false

  const filteredProblems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    const filtered = query
      ? problems.filter((problem) => {
          const containsId = String(problem.problem_id).includes(query)
          const containsTitle = problem.title.toLowerCase().includes(query)
          return containsId || containsTitle
        })
      : problems

    return [...filtered].sort((a, b) => {
      switch (sortCriteria) {
        case 'difficulty-high':
          return Number(b.avgRating) - Number(a.avgRating)
        case 'difficulty-low':
          return Number(a.avgRating) - Number(b.avgRating)
        case 'votes-high':
          return b.voteCount - a.voteCount
        case 'latest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }, [problems, searchTerm, sortCriteria])

  useEffect(() => {
    async function initSession() {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user ?? null)
    }

    initSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    fetchProblemsWithRatings()
    return () => subscription.unsubscribe()
  }, [fetchProblemsWithRatings])

  // 💡 구형 handleSignIn, handleSignUp 로직을 싹 비워내어 충돌 원인을 원천 차단했습니다.

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setStatusMessage('성공적으로 로그아웃되었습니다.')
  };

  const addProblem = async () => {
    if (!problemId || !title) {
      setErrorMessage('문제 번호와 제목을 모두 입력해주세요.')
      return
    }

    setActionLoading(true)
    setStatusMessage(null)
    setErrorMessage(null)

    const { error } = await supabase
      .from('problems')
      .insert([{ problem_id: Number(problemId), title }])

    if (error) {
      setErrorMessage(error.message)
    } else {
      setProblemId('')
      setTitle('')
      fetchProblemsWithRatings()
      setStatusMessage('문제가 성공적으로 등록되었습니다.')
    }

    setActionLoading(false)
  }

  const voteRating = async (pId: number, rating: number) => {
    if (!user) {
      setErrorMessage('투표를 하려면 먼저 로그인해야 합니다.')
      return
    }

    setActionLoading(true)
    setStatusMessage(null)
    setErrorMessage(null)

    const { error } = await supabase
      .from('votes')
      .insert([{ problem_id: pId, rating, user_id: user.id }])

    if (error) {
      if (error.code === '23505') {
        setErrorMessage('이미 이 문제에 투표하셨습니다.')
      } else {
        setErrorMessage('투표 실패: ' + error.message)
      }
    } else {
      setStatusMessage(`${rating}점이 정상적으로 등록되었습니다!`)
      fetchProblemsWithRatings()
    }

    setActionLoading(false)
  }

  return (
    <main className="p-8 max-w-4xl mx-auto font-sans bg-gray-50 min-h-screen text-black">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-blue-900">KOI-DAC</h1>
        {user && (
          <div className="flex items-center gap-4">
            {/* display_name이 있으면 닉네임, 없으면 이메일 출력 */}
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
          <div className="bg-white shadow-sm p-6 rounded-2xl mb-10 border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-700">Submit a problem</h2>
            <div className="flex gap-3 flex-col md:flex-row">
              <input
                type="number"
                placeholder="Problem ID"
                value={problemId}
                onChange={(event) => setProblemId(event.target.value)}
                className="w-full md:w-24 p-3 border rounded-xl bg-gray-50"
              />
              <input
                type="text"
                placeholder="Problem title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="flex-1 p-3 border rounded-xl bg-gray-50"
              />
              <button
                type="button"
                onClick={addProblem}
                disabled={actionLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="문제 번호 또는 제목 검색"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 p-3 border rounded-xl bg-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="sort" className="text-sm text-gray-600">정렬:</label>
              <select
                id="sort"
                value={sortCriteria}
                onChange={(event) => setSortCriteria(event.target.value as SortCriteria)}
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
            <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              {statusMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          )}

          {loadingProblems ? (
            <div className="text-center text-gray-500">Loading problems...</div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center rounded-2xl bg-white border border-gray-200 p-8 text-gray-600">
              해당하는 문제가 없습니다.
            </div>
          ) : (
            <ProblemList problems={filteredProblems} onVote={voteRating} loading={actionLoading} />
          )}
        </>
      )}
    </main>
  )
}