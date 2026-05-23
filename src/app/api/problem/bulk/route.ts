// src/app/api/problems/bulk/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 💡 브라우저의 CORS 완벽 통과를 위한 마스터 헤더 정의
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// 1. 브라우저가 사전에 날리는 OPTIONS(Preflight) 요청 완벽 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// 2. 실제 데이터 가공 처리를 담당하는 POST 핸들러
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { problemIds } = body

    if (!problemIds || !Array.isArray(problemIds)) {
      return NextResponse.json(
        { error: '올바른 문제 번호 리스트가 필요합니다.' }, 
        { status: 400, headers: corsHeaders }
      )
    }

    // 1. DB에서 해당하는 문제 리스트 일괄 조회
    const { data: problems, error: probError } = await supabase
      .from('problems')
      .select('*')
      .in('problem_id', problemIds)

    if (probError) throw probError

    // 2. 투표 데이터 일괄 조회
    const { data: votes, error: voteError } = await supabase
      .from('votes')
      .select('problem_id, rating')
      .in('problem_id', problemIds)

    if (voteError) throw voteError

    // 3. 문제 배열 데이터 가공
    const result = problemIds.map((pId) => {
      const targetProblem = problems?.find((p) => p.problem_id === pId)
      
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

    // 💡 모든 응답 헤더에 corsHeaders를 실어서 보냅니다.
    return NextResponse.json({ data: result }, { status: 200, headers: corsHeaders })

  } catch (error: any) {
    console.error('Bulk API Error:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류' }, 
      { status: 500, headers: corsHeaders }
    )
  }
}