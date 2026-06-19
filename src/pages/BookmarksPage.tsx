import { useAppStore } from '../stores/appStore'
import { Bookmark } from 'lucide-react'

export default function BookmarksPage() {
  const { t } = useAppStore()
  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('bookmark', 'title')}</h1>
      </header>
      <div className="empty-page">
        <Bookmark size={48} className="empty-icon" />
        <p>{t('common', 'noResults')}</p>
      </div>
    </div>
  )
}
