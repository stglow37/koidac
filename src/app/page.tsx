'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthForm } from '@/components/AuthForm'
import { ProblemList } from '@/components/ProblemList'
import { useProblems } from '@/hooks/useProblems'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [problemId, setProblemId] = useState('')
  const [title, setTitle] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { problems, loadingProblems, fetchProblemsWithRatings } = useProblems()

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/?$/, '') ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

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

  const handleSignUp = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.')
      return
    }

    setLoading(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${baseUrl}`,
        },
      })
      if (error) throw error

      setStatusMessage('Verification email sent. Please check your inbox.')
    } catch (err) {
      console.error('Supabase signUp error', err, { baseUrl, email })
      setErrorMessage(err instanceof Error ? err.message : 'Sign up failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.')
      return
    }

    setLoading(true)
    setStatusMessage(null)
    setErrorMessage(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorMessage('Sign in failed: ' + error.message)
    }

    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setStatusMessage('You have been signed out.')
  }

  const addProblem = async () => {
    if (!problemId || !title) {
      setErrorMessage('Please enter both problem number and title.')
      return
    }

    setLoading(true)
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
      setStatusMessage('Problem registered successfully.')
    }

    setLoading(false)
  }

  const voteRating = async (pId: number, rating: number) => {
    if (!user) {
      setErrorMessage('You need to sign in first.')
      return
    }

    setLoading(true)
    setStatusMessage(null)
    setErrorMessage(null)

    const { error } = await supabase
      .from('votes')
      .insert([{ problem_id: pId, rating, user_id: user.id }])

    if (error) {
      if (error.code === '23505') {
        setErrorMessage('You already voted for this problem.')
      } else {
        setErrorMessage('Vote failed: ' + error.message)
      }
    } else {
      setStatusMessage(`${rating} points registered successfully!`)
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
        <AuthForm
          email={email}
          password={password}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          loading={loading}
          errorMessage={errorMessage}
          statusMessage={statusMessage}
        />
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
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                Add
              </button>
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
          ) : (
            <ProblemList problems={problems} onVote={voteRating} loading={loading} />
          )}
        </>
      )}
    </main>
  )
}
