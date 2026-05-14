import Link from 'next/link'

interface ProblemPageProps {
  params: {
    id: string
  }
}

export default function ProblemPage({ params }: ProblemPageProps) {
  return (
    <main className="p-8 min-h-screen bg-gray-50 text-black">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← 목록으로 돌아가기
        </Link>
        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">문제 {params.id} 상세 페이지</h1>
          <p className="mt-4 text-gray-600">현재 {params.id}번 문제의 상세 페이지입니다.</p>
          <div className="mt-8 rounded-2xl bg-blue-50 p-6">
            <p className="font-semibold text-blue-900">다음 단계:</p>
            <ul className="mt-3 list-disc list-inside text-gray-700 space-y-2">
              <li>문제 난이도 투표 섹션 추가</li>
              <li>알고리즘 태그 표시 및 수정 기능</li>
              <li>댓글 목록과 작성 폼 추가</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
