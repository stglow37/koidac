import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function GET(
  _request: Request,
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
    const { data, error } = await supabase
      .from('problems_with_stats')
      .select('*')
      .eq('problem_id', problemId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: '등록되지 않은 문제입니다.' },
        { status: 404, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        problem_id: data.problem_id,
        title: data.title,
        ai_tier: data.ai_tier ?? null,
        ai_algorithms: data.ai_algorithms ?? null,
        avg_rating: data.avg_rating,
        vote_count: data.vote_count,
      },
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders })
}
