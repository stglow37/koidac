import ProblemClient from './ProblemClient'

interface ProblemPageProps {
  params: {
    id: string
  }
}

export default async function ProblemPage({ params }: ProblemPageProps) {
  const resolvedParams = await params
  const problemId = Number(resolvedParams.id)

  return <ProblemClient problemId={problemId} />
}
