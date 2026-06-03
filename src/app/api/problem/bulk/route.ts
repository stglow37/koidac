import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const { problemIds } = await request.json()

    if (!problemIds || !Array.isArray(problemIds)) {
      return NextResponse.json(
        { error: '올바른 문제 번호 리스트가 필요합니다.' },
        { status: 400, headers: corsHeaders }
      )
    }

    const { data, error } = await supabase
      .from('problems_with_stats')
      .select('problem_id, title, ai_tier, avg_rating, vote_count')
      .in('problem_id', problemIds)

    if (error) throw error

    const result = problemIds.map((pId: number) => {
      const found = data?.find((p) => p.problem_id === pId)
      if (!found) return { problem_id: pId, registered: false }

      return {
        problem_id: pId,
        registered: true,
        title: found.title,
        ai_tier: found.ai_tier ?? null,
        avg_rating: found.avg_rating,
        vote_count: found.vote_count,
      }
    })

    return NextResponse.json({ data: result }, { status: 200, headers: corsHeaders })
  } catch (err: any) {
    console.error('Bulk API error:', err)
    return NextResponse.json(
      { error: err.message || '서버 오류' },
      { status: 500, headers: corsHeaders }
    )
  }
}
