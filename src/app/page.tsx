'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [problemId, setProblemId] = useState('')
  const [title, setTitle] = useState('')
  const [problems, setProblems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // 1. 문제 목록과 평균 점수를 함께 가져오는 함수
  const fetchProblemsWithRatings = async () => {
    // 먼저 문제 목록을 가져옵니다.
    const { data: problemsData } = await supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false })

    if (problemsData) {
      // 각 문제별로 투표된 점수들의 평균을 가져옵니다.
      const updatedProblems = await Promise.all(
        problemsData.map(async (p) => {
          const { data: votes } = await supabase
            .from('votes')
            .select('rating')
            .eq('problem_id', p.problem_id)
          
          const avg = votes && votes.length > 0 
            ? (votes.reduce((acc, v) => acc + v.rating, 0) / votes.length).toFixed(1)
            : '0.0'
          
          return { ...p, avgRating: avg, voteCount: votes?.length || 0 }
        })
      )
      setProblems(updatedProblems)
    }
  }

  useEffect(() => {
    fetchProblemsWithRatings()
  }, [])

  const addProblem = async () => {
    if (!problemId || !title) return alert('번호와 제목을 입력하세요!')
    const { error } = await supabase
      .from('problems')
      .insert([{ problem_id: Number(problemId), title: title }])

    if (error) alert('저장 실패: ' + error.message)
    else {
      alert('등록되었습니다!')
      setProblemId(''); setTitle(''); fetchProblemsWithRatings()
    }
  }

  const voteRating = async (pId: number, rating: number) => {
    setLoading(true)
    const { error } = await supabase
      .from('votes')
      .insert([{ problem_id: pId, rating: rating }])

    if (error) alert('투표 실패: ' + error.message)
    else {
      alert(`${rating}점으로 투표되었습니다!`)
      fetchProblemsWithRatings() // 투표 후 즉시 평균 점수 갱신
    }
    setLoading(false)
  }

  return (
    <main className="p-8 max-w-4xl mx-auto font-sans bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-black mb-10 text-center text-blue-900">KOI-DAC</h1>

      {/* 입력 섹션 */}
      <div className="bg-white shadow-sm p-8 rounded-2xl mb-12 border border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-700">새로운 문제 제보</h2>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="번호"
            className="w-28 p-3 border rounded-xl text-black bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            value={problemId}
            onChange={(e) => setProblemId(e.target.value)}
          />
          <input
            type="text"
            placeholder="문제 제목 (예: 소수 판정)"
            className="flex-1 p-3 border rounded-xl text-black bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            onClick={addProblem}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            등록하기
          </button>
        </div>
      </div>

      {/* 리스트 섹션 */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">난이도 투표 현황</h2>
        {problems.map((p) => (
          <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 px-4 py-2 rounded-lg text-blue-700 font-bold text-lg">
                {p.avgRating}
              </div>
              <div>
                <div className="text-sm text-gray-400 font-mono">#{p.problem_id}</div>
                <div className="text-xl font-semibold text-gray-800">{p.title}</div>
                <div className="text-xs text-gray-500 mt-1">{p.voteCount}명이 투표함</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => voteRating(p.problem_id, num)}
                  disabled={loading}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-yellow-400 hover:border-yellow-400 hover:text-white font-bold transition-all disabled:opacity-50 shadow-sm"
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}