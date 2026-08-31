import AppHeader from '../components/AppHeader'
import LevelOnboarding from '../components/LevelOnboarding'
import { isNiveauId } from '@/lib/curriculum'

export default async function NiveauxPage({
  searchParams,
}: {
  searchParams: Promise<{ recommended?: string }>
}) {
  const { recommended } = await searchParams
  const recommendedLevel = isNiveauId(recommended) ? recommended : null

  return (
    <main className="levels-page">
      <AppHeader />
      <LevelOnboarding recommendedLevel={recommendedLevel} />
    </main>
  )
}
