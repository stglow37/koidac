import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 크롬 익스텐션 통신 허용을 위한 공통 CORS 헤더 선언 (POST 추가 허용)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 모든 도메인(익스텐션 환경)에서의 접근을 허용
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// 1. [GET 메서드] 문제 데이터 및 투표 현황 실시간 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params 
  const problemId = Number(id)
  
  if (isNaN(problemId)) {
    return NextResponse.json(
      { error: '올바르지 않은 문제 번호입니다.' },
      { status: 400, headers: corsHeaders } // 에러 응답에도 CORS 헤더 주입!
    )
  }

  try {
    // Supabase 'problems' 테이블에서 해당 문제 기본 정보 가져오기
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('*')
      .eq('problem_id', problemId)
      .single()

    // 코이닥 DB에 아직 등록되지 않은 문제일 경우 404 리턴 ➡️ 익스텐션이 캐치하여 ?? 배지 생성
    if (problemError || !problem) {
      return NextResponse.json(
        { error: '코이닥에 등록되지 않은 문제입니다.' },
        { status: 404, headers: corsHeaders } // 미등록 문제 안내를 익스텐션이 읽을 수 있게 헤더 추가!
      )
    }

    // Supabase 'votes' 테이블에서 이 문제에 투표된 모든 점수 가져오기
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('rating')
      .eq('problem_id', problemId)

    if (votesError) throw votesError

    // 평균 난이도 및 투표 수 계산 로직
    const voteCount = votes?.length || 0
    const avgRating = voteCount > 0
      ? (votes.reduce((sum, v) => sum + v.rating, 0) / voteCount).toFixed(1)
      : '0.0' // 익스텐션에서 parse하기 좋게 '0.0' 데이터로 통일해주면 더 안전합니다.

    // 익스텐션이 가공하기 좋게 깔끔한 JSON 형태로 응답 반환
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
        headers: corsHeaders, // 성공 응답 헤더 연동
      }
    )
  } catch (error) {
    console.error('KOIDAC API Error:', error)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders } // 시스템 예외 에러 응답에도 헤더 주입
    )
  }
}

// 2. 🔥 [POST 메서드] 익스텐션 ?? 배지 클릭 시 자동 문제 신규 등록 엔드포인트
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const problemId = Number(id)

  if (isNaN(problemId)) {
    return NextResponse.json(
      { error: '올바르지 않은 문제 번호입니다.' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    // 크롬 익스텐션이 바디(body)에 담아 보낸 코이스터디 진짜 문제 제목 읽기
    const body = await request.json()
    const { title } = body

    if (!title) {
      return NextResponse.json(
        { error: '문제 제목(title) 파라미터가 누락되었습니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Supabase의 'problems' 테이블에 문제 데이터를 즉시 인서트(Insert)
    const { data, error } = await supabase
      .from('problems')
      .insert([
        { 
          problem_id: problemId, 
          title: title.trim() 
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(
      { 
        message: '문제가 성공적으로 자동 생성되었습니다.', 
        problem: data 
      },
      { 
        status: 201, 
        headers: corsHeaders 
      }
    )
  } catch (error: any) {
    console.error('KOIDAC API Auto Insert Error:', error)
    return NextResponse.json(
      { error: error.message || '데이터베이스 자동 등록 실패' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// 브라우저의 사전 요청(CORS Preflight) 처리용 OPTIONS 메서드
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: corsHeaders, // 선언해둔 공통 헤더 사용
    }
  )
}