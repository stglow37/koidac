'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  // --- 상태 관리 ---
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [problemId, setProblemId] = useState('')
  const [title, setTitle] = useState('')
  const [problems, setProblems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // --- 로그인 상태 체크 ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })
    fetchProblemsWithRatings()
    return () => subscription.unsubscribe()
  }, [])

  // --- 데이터 불러오기 ---
  const fetchProblemsWithRatings = async () => {
    const { data: problemsData } = await supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false })

    if (problemsData) {
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

  // --- 인증 관련 함수 ---
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert("에러: " + error.message)
    else alert('가입 확인 메일을 확인하거나 바로 로그인해보세요!')
  }

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("로그인 실패: " + error.message)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // --- 투표 및 등록 함수 ---
  const addProblem = async () => {
    if (!problemId || !title) return alert('번호와 제목을 입력하세요!')
    const { error } = await supabase
      .from('problems')
      .insert([{ problem_id: Number(problemId), title: title }])
    if (error) alert(error.message)
    else { setProblemId(''); setTitle(''); fetchProblemsWithRatings() }
  }

  const voteRating = async (pId: number, rating: number) => {
    if (!user) return alert('로그인이 필요합니다!')
    setLoading(true)
    
    // 유저 ID를 포함하여 투표 기록 (중복 투표 방지의 핵심)
    const { error } = await supabase
      .from('votes')
      .insert([{ problem_id: pId, rating: rating, user_id: user.id }])

    if (error) {
      // 이미 투표한 경우 DB 제약 조건에 의해 에러가 발생함
      if (error.code === '23505') alert('이미 이 문제에 투표하셨습니다!')
      else alert('투표 실패: ' + error.message)
    } else {
      alert(`${rating}점으로 투표되었습니다!`)
      fetchProblemsWithRatings()
    }
    setLoading(false)
  }

  return (
    <main className="p-8 max-w-4xl mx-auto font-sans bg-gray-50 min-h-screen text-black">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-blue-900">KOI-DAC</h1>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{user.email}</span>
            <button onClick={handleSignOut} className="text-xs text-red-500 hover:underline">로그아웃</button>
          </div>
        )}
      </div>

      {!user ? (
        <div className="bg-white p-8 rounded-2xl shadow-xl border max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-6 text-center">로그인 / 회원가입</h2>
          <div className="space-y-4">
            <input type="email" placeholder="학교 이메일" className="w-full p-3 border rounded-xl" onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="비밀번호" className="w-full p-3 border rounded-xl" onChange={(e) => setPassword(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={handleSignIn} className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold">로그인</button>
              <button onClick={handleSignUp} className="flex-1 bg-gray-100 p-3 rounded-xl font-bold text-gray-600">회원가입</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-sm p-6 rounded-2xl mb-10 border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-700">문제 제보하기</h2>
            <div className="flex gap-3">
              <input type="number" placeholder="번호" className="w-24 p-3 border rounded-xl bg-gray-50" value={problemId} onChange={(e) => setProblemId(e.target.value)} />
              <input type="text" placeholder="문제 제목" className="flex-1 p-3 border rounded-xl bg-gray-50" value={title} onChange={(e) => setTitle(e.target.value)} />
              <button onClick={addProblem} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">등록</button>
            </div>
          </div>

          <div className="space-y-4">
            {problems.map((p) => (
              <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 px-3 py-1 rounded text-blue-700 font-bold">{p.avgRating}</div>
                  <div>
                    <div className="text-xs text-gray-400">#{p.problem_id}</div>
                    <div className="font-bold text-gray-800">{p.title}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button key={num} onClick={() => voteRating(p.problem_id, num)} disabled={loading} className="w-9 h-9 border rounded-lg hover:bg-yellow-400 transition-all font-medium text-sm">
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}