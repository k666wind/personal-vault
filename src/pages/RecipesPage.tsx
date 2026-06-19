import { useAppStore } from '../stores/appStore'
import { BookOpen } from 'lucide-react'

export default function RecipesPage() {
  const { t } = useAppStore()
  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('recipe', 'title')}</h1>
      </header>
      <div className="empty-page">
        <BookOpen size={48} className="empty-icon" />
        <p>{t('common', 'noResults')}</p>
      </div>
    </div>
  )
}
