'use client'

import type { ChangeEvent } from 'react'

interface AuthFormProps {
  email: string
  password: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSignIn: () => void
  onSignUp: () => void
  loading: boolean
  errorMessage: string | null
  statusMessage: string | null
}

export function AuthForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSignIn,
  onSignUp,
  loading,
  errorMessage,
  statusMessage,
}: AuthFormProps) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-6 text-center">로그인 / 회원가입</h2>

      <div className="space-y-4">
        {statusMessage && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            {statusMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        <input
          type="email"
          placeholder="학교 이메일"
          value={email}
          className="w-full p-3 border rounded-xl"
          onChange={(event: ChangeEvent<HTMLInputElement>) => onEmailChange(event.target.value)}
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          className="w-full p-3 border rounded-xl"
          onChange={(event: ChangeEvent<HTMLInputElement>) => onPasswordChange(event.target.value)}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSignIn}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold disabled:opacity-50"
          >
            로그인
          </button>
          <button
            type="button"
            onClick={onSignUp}
            disabled={loading}
            className="flex-1 bg-gray-100 p-3 rounded-xl font-bold text-gray-600 disabled:opacity-50"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  )
}
