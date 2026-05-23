import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // 1. 타입을 Promise로 감싸줍니다.
) {
  // 2. params 객체를 await를 통해 언랩(Unwrap)합니다.
  const { id } = await params 
  const problemId = Number(id)
  
  if (isNaN(problemId)) {
    return NextResponse.json(
      { error: '올바르지 않은 문제 번호입니다.' },
      { status: 400 }
    )
  }

  try {
    // 2. Supabase 'problems' 테이블에서 해당 문제 기본 정보 가져오기
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('*')
      .eq('problem_id', problemId)
      .single()

    // 코이닥 DB에 아직 등록되지 않은 문제일 경우 404 리턴
    if (problemError || !problem) {
      return NextResponse.json(
        { error: '코이닥에 등록되지 않은 문제입니다.' },
        { status: 404 }
      )
    }

    // 3. Supabase 'votes' 테이블에서 이 문제에 투표된 모든 점수 가져오기
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('rating')
      .eq('problem_id', problemId)

    if (votesError) throw votesError

    // 4. 평균 난이도 및 투표 수 계산 로직
    const voteCount = votes?.length || 0
    const avgRating = voteCount > 0
      ? (votes.reduce((sum, v) => sum + v.rating, 0) / voteCount).toFixed(1)
      : '—'

    // 5. 익스텐션이 가공하기 좋게 깔끔한 JSON 형태로 응답 반환
    // ⚠️ 중요: 크롬 익스텐션(다른 도메인)에서 이 API를 호출할 수 있도록 CORS 헤더를 열어줍니다.
    return NextResponse.json(
      {
        problem_id: problem.problem_id,
        title: problem.title,
        description: problem.description || '',
        algorithm: problem.algorithm || '',
        avgRating: avgRating,
        voteCount: voteCount,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', // 모든 도메인(익스텐션 환경 포함)에서의 접근을 허용
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    )
  } catch (error) {
    console.error('KOIDAC API Error:', error)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 브라우저의 사전 요청(CORS Preflight) 처리용 OPTIONS 메서드 추가
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  )
}