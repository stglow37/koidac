// src/app/api/problems/bulk/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { problemIds } = body // 익스텐션이 수집한 문제 번호 배열 (예: [1001, 1002, 1003, ...])

    if (!problemIds || !Array.isArray(problemIds)) {
      return NextResponse.json({ error: '올바른 문제 번호 리스트가 필요합니다.' }, { status: 400, headers: corsHeaders })
    }

    // 1. 전달받은 번호들에 해당하는 문제 데이터 일괄 조회
    const { data: problems, error: probError } = await supabase
      .from('problems')
      .select('*')
      .in('problem_id', problemIds)

    if (probError) throw probError

    // 2. 해당 문제들의 모든 투표 데이터 조회
    const { data: votes, error: voteError } = await supabase
      .from('votes')
      .select('problem_id, rating')
      .in('problem_id', problemIds)

    if (voteError) throw voteError

    // 3. 문제별로 평균 평점 및 투표 수 가공 가공하기
    const result = problemIds.map((pId) => {
      const targetProblem = problems?.find((p) => p.problem_id === pId)
      
      // 등록 안 된 문제라면 상태값 전달
      if (!targetProblem) {
        return { problem_id: pId, registered: false }
      }

      const targetVotes = votes?.filter((v) => v.problem_id === pId) || []
      const voteCount = targetVotes.length
      const avgRating = voteCount > 0
        ? (targetVotes.reduce((sum, v) => sum + v.rating, 0) / voteCount).toFixed(1)
        : '0.0'

      return {
        problem_id: pId,
        registered: true,
        title: targetProblem.title,
        avgRating,
        voteCount
      }
    })

    return NextResponse.json({ data: result }, { status: 200, headers: corsHeaders })
  } catch (error: any) {
    console.error('Bulk API Error:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders })
}