'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('') // 💡 1. 닉네임 입력을 위한 상태(State) 추가
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // 💡 2. 회원가입 시 user_metadata의 display_name 규격에 닉네임을 박아줍니다.
            data: {
              display_name: nickname.trim() || email.split('@')[0],
            },
          },
        })
        if (error) throw error
        alert('회원가입이 완료되었습니다! 로그인해 주세요.')
        setIsSignUp(false)
        setNickname('') // 입력창 초기화
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
          // 여기서도 세션 유지를 원할 시 두 번째 인자로 옵션을 지정할 수 있습니다.
        })
        if (error) throw error
      }
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
      
      {/* 💡 3. 회원가입(Sign Up) 모드일 때만 닉네임 입력 칸이 슬며시 등장합니다. */}
      {isSignUp && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Nickname</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            className="mt-1 block w-full rounded border p-2 text-black focus:border-blue-500 focus:outline-none"
            placeholder="사용할 닉네임 입력"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded border p-2 text-black"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded border p-2 text-black"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-400 font-medium"
      >
        {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
      </button>

      <button
        type="button"
        onClick={() => {
          setIsSignUp(!isSignUp)
          setNickname('') // 모드 전환 시 초기화
        }}
        className="w-full text-sm text-gray-600 hover:underline pt-2"
      >
        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
      </button>
    </form>
  )
}